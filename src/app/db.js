import postgres from 'postgres'

const connectionString =
    'postgresql://postgres:mysecretpassword@localhost:5432/postgres'

const sql = postgres(connectionString, {
    ssl: false, // SSL is not needed for localhost connections
    idle_timeout: 30, // seconds
})

export default sql
