
import { apiFetch } from './api';

export interface User {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
    createdAt: string;
    updatedAt: string;
}

export const fetchUsers = async (): Promise<User[]> => {
    const res = await apiFetch('/users');
    return res.json();
};

export const searchUsers = async (query: string): Promise<User[]> => {
    const res = await apiFetch(`/users/search?q=${encodeURIComponent(query)}`);
    return res.json();
};

export const fetchUserById = async (id: string): Promise<User> => {
    const res = await apiFetch(`/users/${id}`);
    return res.json();
};
