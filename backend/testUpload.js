import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { createTestZip } from './createZip.js';

async function testUpload() {
  try {
    await createTestZip();
    
    const token = jwt.sign(
      { id: '1', email: 'test@test.com', role: 'USER' },
      'evalify_super_secret_jwt_key_2026',
      { expiresIn: '7d' }
    );
    
    const formData = new FormData();
    formData.append('title', 'test');
    formData.append('description', 'test');
    formData.append('language', 'javascript');
    formData.append('projectFile', fs.createReadStream('valid-test.zip'));

    const res = await axios.post('http://localhost:5000/api/projects/analyze', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });
    console.log(res.data);
  } catch (e) {
    console.error(e.message);
    if (e.response) {
      console.error(e.response.data);
    }
  }
}
testUpload();
