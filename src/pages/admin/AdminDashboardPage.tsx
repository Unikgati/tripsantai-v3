import React from 'react';

interface AdminDashboardPageProps {
    destinationCount: number;
    blogPostCount: number;
    totalOrders: number;
    newOrders: number;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ destinationCount, blogPostCount, totalOrders, newOrders }) => {
    return (
        <div>
            <div className="dashboard-grid">
                <div className="dashboard-card">
                    <h3>Total Pesanan Masuk</h3>
                    <p className="count">{totalOrders}</p>
                </div>
                <div className="dashboard-card">
                    <h3>Pesanan Baru</h3>
                    <p className="count">{newOrders}</p>
                </div>
                <div className="dashboard-card">
                    <h3>Total Destinasi</h3>
                    <p className="count">{destinationCount}</p>
                </div>
                <div className="dashboard-card">
                    <h3>Total Artikel Blog</h3>
                    <p className="count">{blogPostCount}</p>
                </div>
            </div>
        </div>
    );
};