"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Database, Users, Settings } from "lucide-react"

interface DatabaseConfig {
  host: string
  user: string
  password: string
  database: string
  socketPath: string
}

interface UserFields {
  pass: string
  full_name: string
  user_level: string
  user_group: string
  phone_login: string
  phone_pass: string
  pass_hash: string
  agentcall_manual: string
  startUserId: number
  endUserId: number
}

interface LogEntry {
  id: string
  type: "success" | "error" | "info"
  message: string
  timestamp: Date
}

export default function VicidialUserManager() {
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    host: "localhost",
    user: "nodeuser",
    password: "nodepass",
    database: "asterisk",
    socketPath: "/var/run/mysql/mysql.sock",
  })

  const [userFields, setUserFields] = useState<UserFields>({
    pass: "",
    full_name: "",
    user_level: "1",
    user_group: "",
    phone_login: "",
    phone_pass: "",
    pass_hash: "",
    agentcall_manual: "AUTO",
    startUserId: 1000,
    endUserId: 1010,
  })

  const [isConnected, setIsConnected] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<LogEntry[]>([])

  const addLog = (type: LogEntry["type"], message: string) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date(),
    }
    setLogs((prev) => [newLog, ...prev].slice(0, 100)) // Keep last 100 logs
  }

  const testConnection = async () => {
    try {
      const response = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbConfig),
      })

      const result = await response.json()

      if (result.success) {
        setIsConnected(true)
        addLog("success", "Database connection successful")
      } else {
        setIsConnected(false)
        addLog("error", `Connection failed: ${result.error}`)
      }
    } catch (error) {
      setIsConnected(false)
      addLog("error", `Connection error: ${error}`)
    }
  }

  const createUsers = async () => {
    if (!isConnected) {
      addLog("error", "Please test database connection first")
      return
    }

    setIsCreating(true)
    setProgress(0)

    const totalUsers = userFields.endUserId - userFields.startUserId + 1
    addLog("info", `Starting bulk creation of ${totalUsers} users...`)

    try {
      const response = await fetch("/api/create-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbConfig, userFields }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n").filter((line) => line.trim())

          for (const line of lines) {
            try {
              const data = JSON.parse(line)

              if (data.type === "progress") {
                setProgress(data.progress)
              } else if (data.type === "success") {
                addLog("success", `Created user: ${data.message}`)
              } else if (data.type === "error") {
                addLog("error", `Error: ${data.message}`)
              } else if (data.type === "complete") {
                addLog("success", `Bulk creation completed: ${data.message}`)
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      addLog("error", `Creation failed: ${error}`)
    } finally {
      setIsCreating(false)
      setProgress(0)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            Vicidial User Manager
          </h1>
          <p className="text-gray-600">Bulk create users in your Vicidial database with ease</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="database" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="database" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Database Config
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  User Fields
                </TabsTrigger>
              </TabsList>

              <TabsContent value="database">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Database Connection
                    </CardTitle>
                    <CardDescription>Configure your MySQL database connection settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="host">Host</Label>
                        <Input
                          id="host"
                          value={dbConfig.host}
                          onChange={(e) => setDbConfig((prev) => ({ ...prev, host: e.target.value }))}
                          placeholder="localhost"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="database">Database</Label>
                        <Input
                          id="database"
                          value={dbConfig.database}
                          onChange={(e) => setDbConfig((prev) => ({ ...prev, database: e.target.value }))}
                          placeholder="asterisk"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="user">Username</Label>
                        <Input
                          id="user"
                          value={dbConfig.user}
                          onChange={(e) => setDbConfig((prev) => ({ ...prev, user: e.target.value }))}
                          placeholder="nodeuser"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={dbConfig.password}
                          onChange={(e) => setDbConfig((prev) => ({ ...prev, password: e.target.value }))}
                          placeholder="nodepass"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="socketPath">Socket Path</Label>
                      <Input
                        id="socketPath"
                        value={dbConfig.socketPath}
                        onChange={(e) => setDbConfig((prev) => ({ ...prev, socketPath: e.target.value }))}
                        placeholder="/var/run/mysql/mysql.sock"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button onClick={testConnection} variant="outline">
                        Test Connection
                      </Button>
                      {isConnected && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="users">
                <Card>
                  <CardHeader>
                    <CardTitle>User Creation Fields</CardTitle>
                    <CardDescription>Configure the user fields and ID range for bulk creation</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Main Fields */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Main Fields</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="pass">Password</Label>
                          <Input
                            id="pass"
                            value={userFields.pass}
                            onChange={(e) => setUserFields((prev) => ({ ...prev, pass: e.target.value }))}
                            placeholder="User password"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="full_name">Full Name (Base)</Label>
                          <Input
                            id="full_name"
                            value={userFields.full_name}
                            onChange={(e) => setUserFields((prev) => ({ ...prev, full_name: e.target.value }))}
                            placeholder="Agent"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="user_level">User Level</Label>
                          <Input
                            id="user_level"
                            value={userFields.user_level}
                            onChange={(e) => setUserFields((prev) => ({ ...prev, user_level: e.target.value }))}
                            placeholder="1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user_group">User Group</Label>
                          <Input
                            id="user_group"
                            value={userFields.user_group}
                            onChange={(e) => setUserFields((prev) => ({ ...prev, user_group: e.target.value }))}
                            placeholder="AGENTS"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Advanced Fields */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Advanced Fields</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone_login">Phone Login (Base)</Label>
                          <Input
                            id="phone_login"
                            value={userFields.phone_login}
                            onChange={(e) => setUserFields((prev) => ({ ...prev, phone_login: e.target.value }))}
                            placeholder="8000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone_pass">Phone Password</Label>
                          <Input
                            id="phone_pass"
                            value={userFields.phone_pass}
                            onChange={(e) => setUserFields((prev) => ({ ...prev, phone_pass: e.target.value }))}
                            placeholder="Phone password"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="pass_hash">Password Hash</Label>
                          <Input
                            id="pass_hash"
                            value={userFields.pass_hash}
                            onChange={(e) => setUserFields((prev) => ({ ...prev, pass_hash: e.target.value }))}
                            placeholder="Optional hash"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="agentcall_manual">Agent Call Manual</Label>
                          <Input
                            id="agentcall_manual"
                            value={userFields.agentcall_manual}
                            onChange={(e) => setUserFields((prev) => ({ ...prev, agentcall_manual: e.target.value }))}
                            placeholder="AUTO"
                          />
                        </div>
                      </div>
                    </div>

                    {/* ID Range */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">ID Range</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="startUserId">Start User ID</Label>
                          <Input
                            id="startUserId"
                            type="number"
                            value={userFields.startUserId}
                            onChange={(e) =>
                              setUserFields((prev) => ({ ...prev, startUserId: Number.parseInt(e.target.value) || 0 }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endUserId">End User ID</Label>
                          <Input
                            id="endUserId"
                            type="number"
                            value={userFields.endUserId}
                            onChange={(e) =>
                              setUserFields((prev) => ({ ...prev, endUserId: Number.parseInt(e.target.value) || 0 }))
                            }
                          />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        Will create {Math.max(0, userFields.endUserId - userFields.startUserId + 1)} users
                      </p>
                    </div>

                    {isCreating && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Creating users...</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="w-full" />
                      </div>
                    )}

                    <Button onClick={createUsers} disabled={!isConnected || isCreating} className="w-full" size="lg">
                      {isCreating ? "Creating Users..." : "Add Users"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Live Log Panel */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-lg">Live Log</CardTitle>
                <CardDescription>Real-time creation status and errors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {logs.length === 0 ? (
                    <p className="text-gray-500 text-sm">No logs yet...</p>
                  ) : (
                    logs.map((log) => (
                      <Alert
                        key={log.id}
                        className={`py-2 ${
                          log.type === "success"
                            ? "border-green-200 bg-green-50"
                            : log.type === "error"
                              ? "border-red-200 bg-red-50"
                              : "border-blue-200 bg-blue-50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {log.type === "success" ? (
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                          ) : log.type === "error" ? (
                            <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                          ) : (
                            <div className="h-4 w-4 rounded-full bg-blue-600 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <AlertDescription className="text-xs break-words">{log.message}</AlertDescription>
                            <p className="text-xs text-gray-500 mt-1">{log.timestamp.toLocaleTimeString()}</p>
                          </div>
                        </div>
                      </Alert>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
