import type { NextRequest } from "next/server";
import mysql from "mysql2/promise";

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { dbConfig, userFields } = await request.json();

        // Create database connection
        const connection = await mysql.createConnection({
          host: dbConfig.host,
          user: dbConfig.user,
          password: dbConfig.password,
          database: dbConfig.database,
          socketPath: dbConfig.socketPath || undefined,
        });

        const totalUsers = userFields.endUserId - userFields.startUserId + 1;
        let createdCount = 0;
        let errorCount = 0;

        for (let userId = userFields.startUserId; userId <= userFields.endUserId; userId++) {
          try {
            const userData = {
              user: userId.toString(), // Required column
              pass: userFields.pass,
              full_name: `${userId}`,
              user_level: userFields.user_level,
              user_group: userFields.user_group,
              phone_login: `${userId}`,
              phone_pass: userFields.phone_pass,
              pass_hash: userFields.pass_hash,
              agentcall_manual: userFields.agentcall_manual,
              active: "Y",
            };

            // Insert user into vicidial_users table
            const insertQuery = `
              INSERT INTO vicidial_users (
                user, pass, full_name, user_level, user_group,
                phone_login, phone_pass, pass_hash, agentcall_manual,
                active
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            await connection.execute(insertQuery, [
              userData.user,
              userData.pass,
              userData.full_name,
              userData.user_level,
              userData.user_group,
              userData.phone_login,
              userData.phone_pass,
              userData.pass_hash,
              userData.agentcall_manual,
              userData.active,
            ]);

            createdCount++;

            const successMessage = JSON.stringify({
              type: "success",
              message: `User ${userId} (${userData.full_name}) created`,
            }) + "\n";
            controller.enqueue(encoder.encode(successMessage));
          } catch (error: any) {
            errorCount++;
            const errorMessage = JSON.stringify({
              type: "error",
              message: `User ${userId}: ${error.message}`,
            }) + "\n";
            controller.enqueue(encoder.encode(errorMessage));
          }

          const progress = Math.round(((userId - userFields.startUserId + 1) / totalUsers) * 100);
          const progressMessage = JSON.stringify({ type: "progress", progress }) + "\n";
          controller.enqueue(encoder.encode(progressMessage));

          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        await connection.end();

        const completeMessage = JSON.stringify({
          type: "complete",
          message: `${createdCount} users created successfully, ${errorCount} errors`,
        }) + "\n";
        controller.enqueue(encoder.encode(completeMessage));
      } catch (error: any) {
        const errorMessage = JSON.stringify({
          type: "error",
          message: `Database connection failed: ${error.message}`,
        }) + "\n";
        controller.enqueue(encoder.encode(errorMessage));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain",
      "Transfer-Encoding": "chunked",
    },
  });
}
