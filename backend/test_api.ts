import axios from 'axios';

async function main() {
  const loginRes = await axios.post('http://localhost:4000/auth/dev-login', {
    email: 'gunsembacanan27@gmail.com'
  });
  
  const token = loginRes.data.tokens.accessToken;
  console.log('Token Length:', token.length);

  const foldersRes = await axios.get('http://localhost:4000/api/file-directory', {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('Folders returned from API:', foldersRes.data.length);
  foldersRes.data.forEach((f: any) => console.log(`Name: ${f.name}, Dept: ${f.department}`));
}

main().catch(e => console.error(e.response ? e.response.data : e.message));
