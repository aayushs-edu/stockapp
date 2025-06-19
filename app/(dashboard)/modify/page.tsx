// app/(dashboard)/modify/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'

export default function ModifyPage() {
  const [recordId, setRecordId] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!recordId) {
      toast({
        title: 'Error',
        description: 'Please enter a record ID',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/stocks/${recordId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Record not found')
        }
        throw new Error('Failed to fetch record')
      }

      const data = await response.json()
      console.log('Found record:', data)
      
      // Navigate to the edit page
      router.push(`/modify/${recordId}`)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Record not found',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Modify Stock Details</CardTitle>
          <CardDescription>
            Enter the record ID to modify or delete a stock transaction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex space-x-2">
              <Input
                type="number"
                placeholder="Enter Record ID"
                value={recordId}
                onChange={(e) => setRecordId(e.target.value)}
                disabled={loading}
              />
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Tip: You can find record IDs in the Trade Book page</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}