'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { APP_CONFIG } from '@/lib/config';
import { setAuthToken, setRefreshToken, setCurrentUser } from '@/lib/api';

const DEV_USERS = [
    { email: 'john.doe@savage.com', name: 'John Doe', role: 'Admin - Engineering' },
    { email: 'jane.smith@savage.com', name: 'Jane Smith', role: 'Manager - Marketing' },
    { email: 'mike.johnson@savage.com', name: 'Mike Johnson', role: 'Member - Operations' },
];

export default function DevLoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (email: string) => {
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${APP_CONFIG.apiUrl}/auth/dev-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (data.success && data.tokens) {
                setAuthToken(data.tokens.accessToken);
                if (data.tokens.refreshToken) setRefreshToken(data.tokens.refreshToken);
                setCurrentUser(data.user);
                router.push('/dashboard');
            } else {
                setError('Login failed. Please try again.');
            }
        } catch (err) {
            console.error('Dev login error:', err);
            setError('Connection error. Make sure backend is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Dev Login
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Select a test user to login
                    </p>
                    {process.env.NODE_ENV === 'production' && (
                        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 rounded text-red-700 dark:text-red-400 text-sm">
                            ⚠️ Dev login is disabled in production
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 rounded text-red-700 dark:text-red-400">
                        {error}
                    </div>
                )}

                <div className="space-y-3">
                    {DEV_USERS.map((user) => (
                        <button
                            key={user.email}
                            onClick={() => handleLogin(user.email)}
                            disabled={loading}
                            className="w-full text-left p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="font-semibold text-gray-900 dark:text-white">
                                {user.name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {user.role}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {user.email}
                            </div>
                        </button>
                    ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                        <p className="mb-2">Or use OAuth login:</p>
                        <div className="flex gap-3 justify-center">
                            <a
                                href="http://localhost:4000/auth/google"
                                className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                                Google
                            </a>
                            <a
                                href="http://localhost:4000/auth/discord"
                                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            >
                                Discord
                            </a>
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="mt-4 text-center text-gray-600 dark:text-gray-400">
                        Logging in...
                    </div>
                )}
            </div>
        </div>
    );
}
