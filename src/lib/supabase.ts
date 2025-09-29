/**
 * Supabase client wrapper.
 * Exports a getSupabaseClient function to avoid creating a client at module eval time in some environments.
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (client) return client
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    // Instead of throwing synchronously (which breaks non-supabase flows),
    // throw an error only when the caller intentionally wants a client.
    // Consumers should check env vars before calling if they need to run
    // in environments where Supabase isn't configured.
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }
  client = createClient(url, anonKey)
  return client
}

export default getSupabaseClient

// --- Convenience CRUD helpers ---
export type SupabaseDestination = any;
export type SupabaseBlogPost = any;

export async function fetchDestinations(): Promise<SupabaseDestination[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('destinations').select('*');
  if (error) throw error;
  // Map database column names (lowercased) back to the app's camelCase shape
  const mapRow = (row: any) => ({
    ...row,
    imageUrl: row.imageurl ?? row.imageUrl ?? '',
  galleryImages: row.galleryimages ?? row.galleryImages ?? row.gallery_images ?? null,
  imagePublicId: row.image_public_id ?? row.imagepublicid ?? row.imagepublic_id ?? null,
  galleryPublicIds: row.gallery_public_ids ?? row.gallerypublicids ?? row.gallery_publicids ?? null,
    longDescription: row.longdescription ?? row.longDescription ?? '',
    priceTiers: row.pricetiers ?? row.priceTiers ?? null,
    minPeople: row.minpeople ?? row.minPeople ?? null,
    mapCoordinates: row.mapcoordinates ?? row.mapCoordinates ?? null,
    created_at: row.created_at ?? row.createdAt ?? null,
  });
  return (data || []).map(mapRow);
}

export async function upsertDestination(dest: any): Promise<any> {
  // If running in a browser (client-side), prefer calling the server endpoint which
  // performs admin-validated upserts using the service_role key. This avoids RLS issues
  // when the client only has anon key.
  const isBrowser = typeof window !== 'undefined';
  if (isBrowser) {
    try {
      // Try to get the current user session token so server can verify admin claim
      const supabase = getSupabaseClient();
      let sessionToken = '';
      try {
        const { data } = await supabase.auth.getSession();
        sessionToken = data?.session?.access_token || '';
      } catch (e) {
        sessionToken = '';
      }

      // If no session token is available in the browser, fail fast with a helpful message.
      // This avoids sending anonymous requests to the server which will return 401 and
      // makes it easier to debug the common "curl works but UI fails" scenario where
      // the user is logged in on a different origin or the session isn't present.
      if (!sessionToken) {
        throw new Error('Missing session token. Please login as admin and refresh the page before saving.');
      }

      const resp = await fetch('/api/upsert-destination', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(dest),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => null);
        // Do NOT fallback to client upsert (anonymous key) because of RLS.
        // Instead surface the server error so the UI can show a clear message.
        const errMsg = `[UPsert] server endpoint failed ${resp.status} ${text || ''}`;
        console.warn(errMsg);
        throw new Error(errMsg);
      }
      const json = await resp.json();
      const row = json?.data ?? json?.destination ?? null;
      if (row) {
        return {
          ...row,
          imageUrl: row.imageurl ?? row.imageUrl ?? '',
          galleryImages: row.galleryimages ?? row.galleryImages ?? row.gallery_images ?? null,
          longDescription: row.longdescription ?? row.longDescription ?? '',
          priceTiers: row.pricetiers ?? row.priceTiers ?? null,
          minPeople: row.minpeople ?? row.minPeople ?? null,
          mapCoordinates: row.mapcoordinates ?? row.mapCoordinates ?? null,
          created_at: row.created_at ?? row.createdAt ?? null,
        };
      }
    } catch (err) {
      console.warn('[UPsert] server endpoint call failed, falling back to client upsert', err);
    }
    // If we reach here, try client-side upsert as last resort (may fail due to RLS)
  }

  // Server-side / fallback behavior: perform direct Supabase upsert (useful for server calls)
  const supabase = getSupabaseClient();
  // PostgREST / Supabase stores unquoted column identifiers in lower-case.
  // Convert the payload keys to lower-case to match the created schema (e.g. galleryImages -> galleryimages).
  const payload: any = {};
  // Ensure we have a usable id for new rows. If frontend used id=0 for new items, generate a timestamp-based id.
  const idToUse = (dest && dest.id && dest.id !== 0) ? dest.id : Date.now();
  Object.keys(dest).forEach(k => {
    // keep the id as 'id' and ensure slug is set below
    const newKey = k === 'id' ? 'id' : k.toLowerCase();
    // map camelCase public id fields to DB column names
    if (k === 'imagePublicId') {
      payload['image_public_id'] = (dest as any)[k];
    } else if (k === 'galleryPublicIds') {
      payload['gallery_public_ids'] = (dest as any)[k];
    } else {
      payload[newKey] = (dest as any)[k];
    }
  });
  payload.id = idToUse;
  // Ensure slug exists in payload. If missing, generate one from title and id.
  const slugify = (input: string) => {
    if (!input) return String(idToUse);
    return input.toString().toLowerCase()
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, 80);
  };
  if (!payload.slug || payload.slug === '') {
    payload.slug = `${idToUse}-${slugify(dest.title || dest.name || String(idToUse))}`;
  }
  const { data, error } = await supabase.from('destinations').upsert(payload, { onConflict: 'id' }).select();
  if (error) throw error;
  // Map created row back to camelCase for the app
  const row = data?.[0] ?? null;
  if (!row) return null;
  return {
    ...row,
    imageUrl: row.imageurl ?? row.imageUrl ?? '',
    galleryImages: row.galleryimages ?? row.galleryImages ?? row.gallery_images ?? null,
    longDescription: row.longdescription ?? row.longDescription ?? '',
    priceTiers: row.pricetiers ?? row.priceTiers ?? null,
    minPeople: row.minpeople ?? row.minPeople ?? null,
    mapCoordinates: row.mapcoordinates ?? row.mapCoordinates ?? null,
    created_at: row.created_at ?? row.createdAt ?? null,
  };
}

export async function deleteDestination(id: number): Promise<void> {
  const isBrowser = typeof window !== 'undefined';
  if (isBrowser) {
    try {
      // Use server endpoint which verifies admin and deletes using service_role key
      const supabase = getSupabaseClient();
      let sessionToken = '';
      try { const { data } = await supabase.auth.getSession(); sessionToken = data?.session?.access_token || ''; } catch (e) { sessionToken = ''; }
      if (!sessionToken) throw new Error('Missing session token. Please login as admin and refresh the page before deleting.');

      const resp = await fetch('/api/delete-destination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ id })
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => null);
        throw new Error(`[Delete] server endpoint failed ${resp.status} ${txt || ''}`);
      }
      return;
    } catch (err) {
      console.warn('[DELETE] server endpoint call failed, falling back to client delete', err);
      // Fall through to client delete below
    }
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('destinations').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchBlogPosts(): Promise<SupabaseBlogPost[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('blog_posts').select('*');
  if (error) throw error;
  // Map common column names back to camelCase
  const mapRow = (row: any) => ({
    ...row,
    imageUrl: row.imageurl ?? row.imageUrl ?? '',
    created_at: row.created_at ?? row.createdAt ?? null,
  });
  return (data || []).map(mapRow);
}

export async function upsertBlogPost(post: any): Promise<any> {
  // Prefer calling the server-side endpoint from the browser so we can use service_role key
  const isBrowser = typeof window !== 'undefined';
  if (isBrowser) {
    try {
      const supabase = getSupabaseClient();
      let sessionToken = '';
      try { const { data } = await supabase.auth.getSession(); sessionToken = data?.session?.access_token || ''; } catch (e) { sessionToken = ''; }
      if (!sessionToken) throw new Error('Missing session token. Please login as admin and refresh the page before saving.');

      const resp = await fetch('/api/upsert-blog-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify(post),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => null);
        const errMsg = `[UPsertBlog] server endpoint failed ${resp.status} ${text || ''}`;
        console.warn(errMsg);
        throw new Error(errMsg);
      }
      const json = await resp.json();
      const row = json?.data ?? null;
      if (row) {
        return {
          ...row,
          imageUrl: row.imageurl ?? row.imageUrl ?? '',
          imagePublicId: row.image_public_id ?? row.imagepublicid ?? null,
          created_at: row.created_at ?? row.createdAt ?? null,
        };
      }
    } catch (err) {
      console.warn('[UPsertBlog] server endpoint call failed, falling back to client upsert', err);
    }
    // fall through to client-side upsert as last resort
  }

  const supabase = getSupabaseClient();
  const payload: any = {};
  const idToUse = (post && post.id && post.id !== 0) ? post.id : Date.now();
  Object.keys(post).forEach(k => {
    // map camelCase public id field to DB column
    if (k === 'imagePublicId') {
      payload['image_public_id'] = (post as any)[k];
    } else {
      const newKey = k === 'id' ? 'id' : k.toLowerCase();
      payload[newKey] = (post as any)[k];
    }
  });
  payload.id = idToUse;
  // Ensure date and slug
  if (!payload.date || payload.date === '') payload.date = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  if (!payload.slug || payload.slug === '') {
    const slugify = (input: string) => {
      if (!input) return String(idToUse);
      return input.toString().toLowerCase()
        .normalize('NFKD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-')
        .slice(0, 80);
    };
    payload.slug = `${idToUse}-${slugify(post.title || String(idToUse))}`;
  }
  const { data, error } = await supabase.from('blog_posts').upsert(payload, { onConflict: 'id' }).select();
  if (error) throw error;
  const row = data?.[0] ?? null;
  if (!row) return null;
  return {
    ...row,
    imageUrl: row.imageurl ?? row.imageUrl ?? '',
    imagePublicId: row.image_public_id ?? row.imagepublicid ?? null,
    created_at: row.created_at ?? row.createdAt ?? null,
  };
}

export async function deleteBlogPost(id: number): Promise<void> {
  const isBrowser = typeof window !== 'undefined';
  if (isBrowser) {
    try {
      const supabase = getSupabaseClient();
      let sessionToken = '';
      try { const { data } = await supabase.auth.getSession(); sessionToken = data?.session?.access_token || ''; } catch (e) { sessionToken = ''; }
      if (!sessionToken) throw new Error('Missing session token. Please login as admin and refresh the page before deleting.');

      const resp = await fetch('/api/delete-blog-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ id })
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => null);
        throw new Error(`[Delete] server endpoint failed ${resp.status} ${txt || ''}`);
      }
      return;
    } catch (err) {
      console.warn('[DELETE] server endpoint call failed, falling back to client delete', err);
    }
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('blog_posts').delete().eq('id', id);
  if (error) throw error;
}

// Insert an order (used by the public booking flow). Maps camelCase fields to DB column names.
export async function insertOrder(order: any): Promise<any> {
  const supabase = getSupabaseClient();
  // Map to DB column names
  const payload: any = {
    id: order.id,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    destination_id: order.destinationId,
    destination_title: order.destinationTitle,
    order_date: order.orderDate, // timestamptz
    departure_date: order.departureDate ?? null, // date
    participants: order.participants,
    total_price: order.totalPrice,
    status: order.status,
    payment_status: order.paymentStatus ?? null,
    payment_history: order.paymentHistory ?? null,
    notes: order.notes ?? null,
  };

  const { data, error } = await supabase.from('orders').insert(payload).select();
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function fetchOrders(): Promise<any[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('orders').select('*').order('order_date', { ascending: false });
  if (error) throw error;
  const mapRow = (row: any) => ({
    id: row.id,
    customerName: row.customer_name ?? row.customerName ?? '',
    customerPhone: row.customer_phone ?? row.customerPhone ?? '',
    destinationId: row.destination_id ?? row.destinationId ?? null,
    destinationTitle: row.destination_title ?? row.destinationTitle ?? '',
    orderDate: row.order_date ?? row.orderDate ?? null,
    departureDate: row.departure_date ?? row.departureDate ?? null,
    participants: row.participants ?? row.participants ?? 0,
    totalPrice: Number(row.total_price ?? row.totalPrice ?? 0),
    status: row.status ?? 'Baru',
    paymentStatus: row.payment_status ?? row.paymentStatus ?? undefined,
    paymentHistory: row.payment_history ?? row.paymentHistory ?? undefined,
    notes: row.notes ?? null,
  });
  return (data || []).map(mapRow);
}

// Fetch app settings from the single-row app_settings table (id = 1)
export async function fetchAppSettings(): Promise<any | null> {
  const supabase = getSupabaseClient();
  // Prefer the public view which is safe to expose to anonymous clients.
  try {
    const { data: publicData, error: publicErr } = await supabase.from('app_settings_public').select('*').limit(1).single();
    if (!publicErr && publicData) {
      const row = publicData as any;
      return {
        theme: row.theme ?? 'light',
        accentColor: row.accentcolor ?? '#3182ce',
        brandName: row.brandname ?? 'TravelGo',
        tagline: row.tagline ?? '',
        logoLightUrl: row.logolighturl ?? '',
        logoDarkUrl: row.logodarkurl ?? '',
        favicon16Url: row.favicon16url ?? '',
        favicon192Url: row.favicon192url ?? '',
        favicon512Url: row.favicon512url ?? '',
        email: row.email ?? '',
        address: row.address ?? '',
        whatsappNumber: row.whatsappnumber ?? '',
        facebookUrl: row.facebookurl ?? '',
        instagramUrl: row.instagramurl ?? '',
        twitterUrl: row.twitterurl ?? '',
        bankName: row.bankname ?? '',
        bankAccountNumber: row.bankaccountnumber ?? '',
        bankAccountHolder: row.bankaccountholder ?? '',
        heroSlides: row.heroslides ?? [],
      };
    }
  } catch (e) {
    // ignore and fallback to direct app_settings lookup (may require auth)
  }

  // Fallback to querying the protected table (useful when admin is logged-in)
  const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).limit(1).single();
  if (error) {
    // If row doesn't exist or permission denied, return null to let client fallback to defaults/localStorage
    console.warn('[SUPABASE] fetchAppSettings error', error.message || error);
    return null;
  }
  const row = data as any;
  if (!row) return null;
  return {
  theme: row.theme ?? 'light',
  accentColor: row.accentcolor ?? '#3182ce',
  brandName: row.brandname ?? 'TravelGo',
  tagline: row.tagline ?? '',
  logoLightUrl: row.logolighturl ?? '',
  logoDarkUrl: row.logodarkurl ?? '',
  favicon16Url: row.favicon16url ?? '',
  favicon192Url: row.favicon192url ?? '',
  favicon512Url: row.favicon512url ?? '',
  email: row.email ?? '',
  address: row.address ?? '',
  whatsappNumber: row.whatsappnumber ?? '',
  facebookUrl: row.facebookurl ?? '',
  instagramUrl: row.instagramurl ?? '',
  twitterUrl: row.twitterurl ?? '',
  bankName: row.bankname ?? '',
  bankAccountNumber: row.bankaccountnumber ?? '',
  bankAccountHolder: row.bankaccountholder ?? '',
  heroSlides: row.heroslides ?? [],
  };
}

export async function fetchReviews(): Promise<any[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    ...row,
    rating: row.rating ?? 5,
    created_at: row.created_at ?? row.createdAt ?? null,
  }));
}

export async function insertReview(review: { name: string; initials: string; content: string; rating?: number }): Promise<any> {
  const isBrowser = typeof window !== 'undefined';
  const payload = {
    name: review.name,
    initials: review.initials,
    content: review.content,
    rating: review.rating ?? 5,
  };

  if (isBrowser) {
    // Post to server endpoint which validates and inserts using service_role key
    const resp = await fetch('/api/create-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => null);
      throw new Error(`Server error: ${resp.status} ${txt || ''}`);
    }
    const json = await resp.json();
    return json?.data ?? null;
  }

  // Server-side fallback: insert directly using Supabase client
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('reviews').insert(payload).select();
  if (error) throw error;
  return (data && data[0]) || null;
}

// Upsert the single settings row (id = 1). `settings` should match AppSettings shape.
export async function upsertAppSettings(settings: any): Promise<any | null> {
  const isBrowser = typeof window !== 'undefined';
  if (isBrowser) {
    try {
      const supabase = getSupabaseClient();
      let sessionToken = '';
      try { const { data } = await supabase.auth.getSession(); sessionToken = data?.session?.access_token || ''; } catch (e) { sessionToken = ''; }
      if (!sessionToken) throw new Error('Missing session token. Please login as admin and refresh the page before saving.');

      const resp = await fetch('/api/upsert-app-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify(settings),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => null);
        const errMsg = `[upsertAppSettings] server endpoint failed ${resp.status} ${text || ''}`;
        console.warn(errMsg);
        throw new Error(errMsg);
      }
      const json = await resp.json();
      const row = json?.data ?? null;
      if (row) {
        return {
          theme: row.theme ?? 'light',
          accentColor: row.accentcolor ?? '#3182ce',
          brandName: row.brandname ?? 'TravelGo',
          tagline: row.tagline ?? '',
          logoLightUrl: row.logolighturl ?? '',
          logoDarkUrl: row.logodarkurl ?? '',
          favicon16Url: row.favicon16url ?? '',
          favicon192Url: row.favicon192url ?? '',
          favicon512Url: row.favicon512url ?? '',
          email: row.email ?? '',
          address: row.address ?? '',
          whatsappNumber: row.whatsappnumber ?? '',
          facebookUrl: row.facebookurl ?? '',
          instagramUrl: row.instagramurl ?? '',
          twitterUrl: row.twitterurl ?? '',
          bankName: row.bankname ?? '',
          bankAccountNumber: row.bankaccountnumber ?? '',
          bankAccountHolder: row.bankaccountholder ?? '',
          heroSlides: row.heroslides ?? [],
        };
      }
    } catch (err) {
      console.warn('[upsertAppSettings] server endpoint call failed, falling back to client upsert', err);
    }
    // fall through to client-side upsert as last resort
  }

  const supabase = getSupabaseClient();
  const payload = {
    id: 1,
    theme: settings.theme,
    accentcolor: settings.accentColor,
    brandname: settings.brandName,
    tagline: settings.tagline,
    logolighturl: settings.logoLightUrl,
    logodarkurl: settings.logoDarkUrl,
    favicon16url: settings.favicon16Url,
    favicon192url: settings.favicon192Url,
    favicon512url: settings.favicon512Url,
    email: settings.email,
    address: settings.address,
    whatsappnumber: settings.whatsappNumber,
    facebookurl: settings.facebookUrl,
    instagramurl: settings.instagramUrl,
    twitterurl: settings.twitterUrl,
    bankname: settings.bankName,
    bankaccountnumber: settings.bankAccountNumber,
    bankaccountholder: settings.bankAccountHolder,
    heroslides: settings.heroSlides ?? [],
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('app_settings').upsert(payload, { onConflict: 'id' }).select();
  if (error) {
    console.warn('[SUPABASE] upsertAppSettings error', error.message || error);
    throw error;
  }
  const row = data?.[0] ?? null;
  if (!row) return null;
  return {
    theme: row.theme ?? 'light',
    accentColor: row.accentcolor ?? '#3182ce',
    brandName: row.brandname ?? 'TravelGo',
    tagline: row.tagline ?? '',
    logoLightUrl: row.logolighturl ?? '',
    logoDarkUrl: row.logodarkurl ?? '',
    favicon16Url: row.favicon16url ?? '',
    favicon192Url: row.favicon192url ?? '',
    favicon512Url: row.favicon512url ?? '',
    email: row.email ?? '',
    address: row.address ?? '',
    whatsappNumber: row.whatsappnumber ?? '',
    facebookUrl: row.facebookurl ?? '',
    instagramUrl: row.instagramurl ?? '',
    twitterUrl: row.twitterurl ?? '',
    bankName: row.bankname ?? '',
    bankAccountNumber: row.bankaccountnumber ?? '',
    bankAccountHolder: row.bankaccountholder ?? '',
    heroSlides: row.heroslides ?? [],
  };
}

// Update an existing order by id. `patch` should use camelCase keys (e.g. paymentHistory) and will be mapped to DB columns.
export async function updateOrder(id: number, patch: any): Promise<any> {
  const supabase = getSupabaseClient();
  const payload: any = {};
  if (patch.customerName !== undefined) payload.customer_name = patch.customerName;
  if (patch.customerPhone !== undefined) payload.customer_phone = patch.customerPhone;
  if (patch.destinationId !== undefined) payload.destination_id = patch.destinationId;
  if (patch.destinationTitle !== undefined) payload.destination_title = patch.destinationTitle;
  if (patch.orderDate !== undefined) payload.order_date = patch.orderDate;
  if (patch.departureDate !== undefined) payload.departure_date = patch.departureDate;
  if (patch.participants !== undefined) payload.participants = patch.participants;
  if (patch.totalPrice !== undefined) payload.total_price = patch.totalPrice;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.paymentStatus !== undefined) payload.payment_status = patch.paymentStatus;
  if (patch.paymentHistory !== undefined) payload.payment_history = patch.paymentHistory;
  if (patch.notes !== undefined) payload.notes = patch.notes;

  const { data, error } = await supabase.from('orders').update(payload).eq('id', id).select();
  if (error) throw error;
  const row = data?.[0] ?? null;
  if (!row) return null;
  return {
    id: row.id,
    customerName: row.customer_name ?? row.customerName ?? '',
    customerPhone: row.customer_phone ?? row.customerPhone ?? '',
    destinationId: row.destination_id ?? row.destinationId ?? null,
    destinationTitle: row.destination_title ?? row.destinationTitle ?? '',
    orderDate: row.order_date ?? row.orderDate ?? null,
    departureDate: row.departure_date ?? row.departureDate ?? null,
    participants: row.participants ?? row.participants ?? 0,
    totalPrice: Number(row.total_price ?? row.totalPrice ?? 0),
    status: row.status ?? 'Baru',
    paymentStatus: row.payment_status ?? row.paymentStatus ?? undefined,
    paymentHistory: row.payment_history ?? row.paymentHistory ?? undefined,
    notes: row.notes ?? null,
  };
}



// Create a shareable invoice record. If Supabase is configured, insert into `invoices` table
// and return the created invoice row. If not configured or insertion fails, return a
// fallback object with a generated id (timestamp) that the client can use to build a
// one-off invoice link. Invoice rows should contain at least: id, order_id, total, metadata, created_at
export async function createInvoiceForOrder(orderId: number, total: number, metadata: any = {}): Promise<any> {
  const useSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  // If running in browser, prefer server endpoint which performs verification and uses service_role key.
  const isBrowser = typeof window !== 'undefined';
  if (isBrowser) {
    try {
      // Try to get current session token so server can verify admin claim
      const supabase = getSupabaseClient();
      let sessionToken = '';
      try {
        const { data } = await supabase.auth.getSession();
        sessionToken = data?.session?.access_token || '';
      } catch (e) {
        sessionToken = '';
      }
      if (!sessionToken) {
        // Enforce server-only creation: require admin session.
        throw new Error('Missing admin session. Invoice creation must be performed by a logged-in admin via the server endpoint.');
      }

      const resp = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ order_id: orderId, total, metadata })
      });
      if (resp.ok) {
        const json = await resp.json();
        return json?.invoice ?? json?.data ?? null;
      }
      const txt = await resp.text().catch(() => null);
      throw new Error('[createInvoiceForOrder] server endpoint failed: ' + (txt || resp.status));
    } catch (err) {
      console.warn('[createInvoiceForOrder] server endpoint call failed', err);
      throw err;
    }
  }
  // Server-side (non-browser) execution: perform direct insert via Supabase client.
  if (!useSupabase) {
    return { id: orderId, order_id: orderId, total, metadata, share_token: null };
  }

  try {
    const supabase = getSupabaseClient();
    const payload = { order_id: orderId, total, metadata } as any;
    const { data: inserted, error: insertError } = await supabase.from('invoices').insert(payload).select().limit(1).single();
    if (!insertError && inserted) return inserted;
    const { data: existing, error: fetchErr } = await supabase.from('invoices').select('*').eq('order_id', orderId).limit(1).single();
    if (!fetchErr && existing) return existing;
    console.warn('[SUPABASE] createInvoiceForOrder insert failed', insertError?.message || insertError);
    throw insertError || new Error('Invoice insert failed');
  } catch (err) {
    console.warn('[SUPABASE] createInvoiceForOrder error', err);
    throw err;
  }
}

// Fetch invoice by invoice id (primary key in invoices table)
export async function fetchInvoiceById(invoiceId: number): Promise<any | null> {
  const useSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!useSupabase) return null;
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('invoices').select('*').eq('id', invoiceId).limit(1).single();
    if (error) {
      console.warn('[SUPABASE] fetchInvoiceById failed', error.message || error);
      return null;
    }
    return data ?? null;
  } catch (err) {
    console.warn('[SUPABASE] fetchInvoiceById error', err);
    return null;
  }
}

// Fetch invoice by its share_token (public identifier)
export async function fetchInvoiceByToken(token: string): Promise<any | null> {
  const useSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!useSupabase) return null;
  try {
    const supabase = getSupabaseClient();
    // Use RPC to call SECURITY DEFINER function that returns invoice by token.
    // This avoids RLS blocking anonymous callers from selecting directly from invoices.
    const { data, error } = await supabase.rpc('fetch_invoice_by_token', { p_token: token });
    if (error) {
      console.warn('[SUPABASE] fetchInvoiceByToken rpc failed', error.message || error);
      return null;
    }
    // RPC returns an array of rows for set-returning functions; return first row if present
    if (Array.isArray(data)) return data[0] ?? null;
    return data ?? null;
  } catch (err) {
    console.warn('[SUPABASE] fetchInvoiceByToken error', err);
    return null;
  }
}

// Fetch invoice together with its order by token using security-definer RPC
export async function fetchInvoiceWithOrderByToken(token: string): Promise<any | null> {
  const useSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!useSupabase) return null;
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('fetch_invoice_by_token_with_order', { p_token: token });
    if (error) {
      console.warn('[SUPABASE] fetchInvoiceWithOrderByToken rpc failed', error.message || error);
      return null;
    }
    const row = Array.isArray(data) ? data[0] ?? null : data ?? null;
    if (!row) return null;
    // Map RPC columns to shapes the app expects
    return {
      invoice: {
        id: row.invoice_id ?? row.id,
        total: row.total,
        metadata: row.metadata,
        share_token: row.share_token,
        created_at: row.created_at,
      },
      order: {
        id: row.order_id,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        destinationId: row.destination_id,
        destinationTitle: row.destination_title,
        orderDate: row.order_date,
        departureDate: row.departure_date,
        participants: row.participants,
        totalPrice: Number(row.total_price ?? row.totalPrice ?? 0),
        status: row.status ?? 'Baru',
        paymentStatus: row.payment_status ?? undefined,
        paymentHistory: row.payment_history ?? undefined,
        notes: row.notes ?? null,
      }
    };
  } catch (err) {
    console.warn('[SUPABASE] fetchInvoiceWithOrderByToken error', err);
    return null;
  }
}

// Fetch order by id (wrap existing fetchOrders filter behavior)
export async function fetchOrderById(orderId: number): Promise<any | null> {
  const useSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!useSupabase) return null;
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).limit(1).single();
    if (error) {
      console.warn('[SUPABASE] fetchOrderById failed', error.message || error);
      return null;
    }
    const row = data as any;
    return row ? {
      id: row.id,
      customerName: row.customer_name ?? row.customerName ?? '',
      customerPhone: row.customer_phone ?? row.customerPhone ?? '',
      destinationId: row.destination_id ?? row.destinationId ?? null,
      destinationTitle: row.destination_title ?? row.destinationTitle ?? '',
      orderDate: row.order_date ?? row.orderDate ?? null,
      departureDate: row.departure_date ?? row.departureDate ?? null,
      participants: row.participants ?? row.participants ?? 0,
      totalPrice: Number(row.total_price ?? row.totalPrice ?? 0),
      status: row.status ?? 'Baru',
      paymentStatus: row.payment_status ?? row.paymentStatus ?? undefined,
      paymentHistory: row.payment_history ?? row.paymentHistory ?? undefined,
      notes: row.notes ?? null,
    } : null;
  } catch (err) {
    console.warn('[SUPABASE] fetchOrderById error', err);
    return null;
  }
}
