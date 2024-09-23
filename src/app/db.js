// db.js
import postgres from 'postgres'

const connectionString =
    'postgresql://postgres:mysecretpassword@10.237.17.200:5432/postgres'

const sql = postgres(connectionString)


export default sql
