import React, { useState, useEffect, createContext, useContext } from 'react';

type WishlistContextType = {
  wishlist: number[];
  addToWishlist: (id: number) => void;
  removeFromWishlist: (id: number) => void;
  isInWishlist: (id: number) => boolean;
};
const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const [wishlist, setWishlist] = useState<number[]>([]);

  useEffect(() => {
    try {
      const storedWishlist = localStorage.getItem('wishlist');
      if (storedWishlist) {
        setWishlist(JSON.parse(storedWishlist));
      }
    } catch (error) {
      console.error("Failed to parse wishlist from localStorage", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const addToWishlist = (id: number) => {
    setWishlist((prev) => [...prev, id]);
  };

  const removeFromWishlist = (id: number) => {
    setWishlist((prev) => prev.filter((itemId) => itemId !== id));
  };

  const isInWishlist = (id: number) => {
    return wishlist.includes(id);
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
};
