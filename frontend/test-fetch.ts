import fs from 'fs';

async function testFetch() {
    try {
        const fetch = require('node-fetch');
        const res = await fetch('http://localhost:4000/api/daily-logs', {
            headers: {
                // Not authenticated! But the route requires it.
                // We need to fetch directly from the DB via prisma.
            }
        });
    } catch (e) { }
}
