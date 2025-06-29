// app/(dashboard)/modify/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import { EnhancedDatePicker } from '@/components/ui/enhanced-date-picker'
import { useAccounts } from '@/components/providers/accounts-provider'

const formSchema = z.object({
  userid: z.string().min(1, 'Account is required'),
  date: z.date({
    required_error: 'Date is required',
  }),
  stock: z.string().min(1, 'Stock symbol is required').transform(v => v.toUpperCase()),
  action: z.enum(['Buy', 'Sell']),
  source: z.string().optional(),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  price: z.coerce.number().positive('Price must be positive'),
  brokerage: z.coerce.number().min(0, 'Brokerage cannot be negative'),
  remarks: z.string().optional(),
  orderRef: z.string().optional(),
})

export default function ModifyStockPage({ params }: { params: { id: string } }) {
  const { accounts, loading: accountsLoading } = useAccounts() // Use all accounts for modify page
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userid: '',
      stock: '',
      action: 'Buy',
      source: '',
      quantity: 0,
      price: 0,
      brokerage: 0,
      remarks: '',
      orderRef: '',
    }
  })

  useEffect(() => {
    fetchStock()
  }, [params.id])

  const fetchStock = async () => {
    try {
      setDataLoading(true)
      const response = await fetch(`/api/stocks/${params.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch stock')
      }
      
      const data = await response.json()
      console.log('Stock data:', data)
      
      // Reset form with fetched data
      form.reset({
        userid: data.userid,
        date: new Date(data.date),
        stock: data.stock,
        action: data.action,
        source: data.source || '',
        quantity: data.quantity,
        price: data.price,
        brokerage: data.brokerage,
        remarks: data.remarks || '',
        orderRef: data.orderRef || '',
      })
    } catch (error) {
      console.error('Error fetching stock:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch stock details',
        variant: 'destructive',
      })
      router.push('/modify')
    } finally {
      setDataLoading(false)
    }
  }

  const tradeValue = form.watch('quantity') * form.watch('price') || 0

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    try {
      const response = await fetch(`/api/stocks/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update stock')
      }

      toast({
        title: 'Success',
        description: 'Stock transaction updated successfully',
      })
      
      // Redirect back to the modify page to edit another transaction
      router.push('/modify')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update stock transaction',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/stocks/${params.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete stock')
      }

      toast({
        title: 'Success',
        description: 'Stock transaction deleted successfully',
      })
      
      // Redirect back to the modify page to edit another transaction
      router.push('/modify')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete stock transaction',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Modify Stock Transaction #{params.id}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Account and Date in first row */}
                <FormField
                  control={form.control}
                  name="userid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Account</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={accountsLoading ? "Loading..." : "Select an account"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {accountsLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="ml-2 text-sm">Loading accounts...</span>
                            </div>
                          ) : accounts.length === 0 ? (
                            <div className="py-4 text-center text-sm text-muted-foreground">
                              No accounts found
                            </div>
                          ) : (
                            accounts.map((account) => (
                              <SelectItem key={account.userid} value={account.userid}>
                                {account.userid} - {account.name} {!account.active && '(Inactive)'}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Date</FormLabel>
                      <FormControl>
                        <EnhancedDatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Enter or select date"
                          className="w-full h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Stock and Action in second row */}
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Stock Symbol</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., RELIANCE" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="action"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Transaction Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Buy">Buy</SelectItem>
                          <SelectItem value="Sell">Sell</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Quantity and Price in third row */}
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Price per Share</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Brokerage and Source in fourth row */}
                <FormField
                  control={form.control}
                  name="brokerage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Brokerage</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Source</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., NSE, BSE" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Order Reference spans full width */}
                <FormField
                  control={form.control}
                  name="orderRef"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-xs">Order Reference</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional order reference" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Trade Value Display */}
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs font-medium text-muted-foreground">Trade Value</p>
                <p className="text-lg font-bold">{formatCurrency(tradeValue)}</p>
              </div>

              {/* Remarks Field */}
              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Remarks</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional notes..."
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading} size="sm">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" disabled={deleting} size="sm">
                      {deleting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the
                        stock transaction record.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/modify')}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}