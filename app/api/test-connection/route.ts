import { type NextRequest, NextResponse } from "next/server"
import mysql from "mysql2/promise"

export async function POST(request: NextRequest) {
  try {
    const { host, user, password, database, socketPath } = await request.json()

    const connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
      socketPath: socketPath || undefined,
    })

    // Test the connection with a simple query
    await connection.execute("SELECT 1")
    await connection.end()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 400 },
    )
  }
}
