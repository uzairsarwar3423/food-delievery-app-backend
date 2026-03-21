const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.mgrtjayscgtczumdnofg:yFhtDLGrdvenpUVa@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require',
});

client.connect()
  .then(() => {
    console.log('pg successfully connected to aws-1');
    return client.query('SELECT 1');
  })
  .then((res) => {
    console.log('query result:', res.rows);
    client.end();
  })
  .catch((err) => console.error('pg connection error:', err));
