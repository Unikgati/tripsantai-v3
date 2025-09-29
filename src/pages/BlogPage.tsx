import React from 'react';
import { BlogPost } from '../types';
import { BlogCard } from '../components/BlogCard';
import BlogSkeleton from '../components/BlogSkeleton';

interface BlogPageProps {
    blogPosts: BlogPost[];
    onViewDetail: (post: BlogPost) => void;
    isLoading?: boolean;
    brandName?: string;
}

export const BlogPage: React.FC<BlogPageProps> = ({ blogPosts, onViewDetail, isLoading = false, brandName }) => (
    <div className="page-container">
        <div className="container">
            <div className="page-header">
                <h1>{brandName ? `Blog ${brandName}` : 'Blog'}</h1>
                <p>Inspirasi perjalanan dan panduan ahli dari tim kami.</p>
            </div>
            <div className="blog-grid">
                {isLoading ? Array.from({ length: 6 }).map((_, i) => <BlogSkeleton key={i} />) : blogPosts.map(post => <BlogCard key={post.id} post={post} onViewDetail={onViewDetail} />)}
            </div>
        </div>
    </div>
);