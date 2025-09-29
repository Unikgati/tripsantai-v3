import React from 'react';
import { BlogPost } from '../types';

interface BlogCardProps {
    post: BlogPost;
    onViewDetail: (post: BlogPost) => void;
}

export const BlogCard: React.FC<BlogCardProps> = ({ post, onViewDetail }) => {
    const { title, content, imageUrl, category, author, date } = post;
    
    // Function to strip HTML tags for a plain text preview
    const createSnippet = (htmlContent: string) => {
        // A simple and safe way to convert HTML to text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        return tempDiv.textContent || tempDiv.innerText || "";
    };

    const snippet = createSnippet(content);

    return (
        <article className="blog-card" onClick={() => onViewDetail(post)}>
            <div className="blog-card-image-container">
                <img src={imageUrl} alt={title} loading="lazy" decoding="async" />
                 <span className="blog-card-category">{category}</span>
            </div>
            <div className="blog-card-content">
                <h3>{title}</h3>
                <p className="blog-card-excerpt">{snippet}</p>
                <div className="blog-card-meta">
                    <span>Oleh: {author}</span>
                    <span>{date}</span>
                </div>
            </div>
        </article>
    );
};