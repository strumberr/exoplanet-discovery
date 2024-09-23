// db.js
import postgres from 'postgres'

const connectionString =
    'postgresql://postgres:mysecretpassword@localhost:5432/postgres'

const sql = postgres(connectionString)


export default sql
