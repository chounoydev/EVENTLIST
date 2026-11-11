export interface AuthUser {
  id: number
  name: string
  email: string
  role: 'user' | 'admin' | 'owner'
  is_active: boolean
  created_at: string
  updated_at: string
}

declare global {
  namespace Express {
    interface Request {
      auth?: {
        user: AuthUser
        tokenId: number
      }
    }
  }
}
