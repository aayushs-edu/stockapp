'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, Loader2, Upload, FileText, Plus, Download, AlertCircle, Check, X } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  AlertDialog as Alert,
  AlertDialogDescription as AlertDescription,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

interface ParsedTransaction {
  userid: string
  date: string
  stock: string
  action: 'Buy' | 'Sell'
  source?: string
  quantity: number
  price: number
  brokerage: number
  remarks?: string
  orderRef?: string
  tradeValue?: number
  isValid: boolean
  errors: string[]
}

export default function AddStockPage() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('single')
  
  // Bulk upload states
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([])
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const router = useRouter()
  const { toast } = useToast()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      action: 'Buy',
      brokerage: 0,
      remarks: '',
      orderRef: '',
    },
  })

  useEffect(() => {
    fetch('/api/accounts')
      .then(res => res.json())
      .then(data => setAccounts(data))
  }, [])

  const tradeValue = form.watch('quantity') * form.watch('price') || 0

  // Single transaction submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    try {
      const response = await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          tradeValue,
        }),
      })

      if (!response.ok) throw new Error('Failed to add stock')

      toast({
        title: 'Success',
        description: 'Stock transaction added successfully',
      })
      
      form.reset()
      router.push('/transactions')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add stock transaction',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    setUploadLoading(true)
    setParsedData([])

    try {
      const text = await uploadedFile.text()
      const parsed = parseCSV(text)
      setParsedData(parsed)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to parse file',
        variant: 'destructive',
      })
    } finally {
      setUploadLoading(false)
    }
  }

  // CSV parsing function
  const parseCSV = (text: string): ParsedTransaction[] => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const data: ParsedTransaction[] = []

    // Expected headers mapping
    const headerMap = {
      userid: ['userid', 'user_id', 'account', 'user'],
      date: ['date', 'transaction_date', 'trade_date'],
      stock: ['stock', 'symbol', 'stock_symbol'],
      action: ['action', 'type', 'transaction_type'],
      source: ['source', 'market'],
      quantity: ['quantity', 'qty', 'shares'],
      price: ['price', 'rate', 'share_price'],
      brokerage: ['brokerage', 'charges', 'fees'],
      remarks: ['remarks', 'notes', 'comment'],
      orderRef: ['order_ref', 'orderref', 'reference', 'order_reference']
    }

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length < 3) continue // Skip empty/incomplete lines

      const transaction: ParsedTransaction = {
        userid: '',
        date: '',
        stock: '',
        action: 'Buy',
        quantity: 0,
        price: 0,
        brokerage: 0,
        isValid: true,
        errors: []
      }

      // Map values to transaction properties
      Object.entries(headerMap).forEach(([key, possibleHeaders]) => {
        const headerIndex = headers.findIndex(h => possibleHeaders.includes(h))
        if (headerIndex !== -1 && values[headerIndex]) {
          const value = values[headerIndex]
          
          switch (key) {
            case 'userid':
              transaction.userid = value.toUpperCase()
              break
            case 'date':
              transaction.date = value
              break
            case 'stock':
              transaction.stock = value.toUpperCase()
              break
            case 'action':
              transaction.action = value.toLowerCase() === 'sell' ? 'Sell' : 'Buy'
              break
            case 'quantity':
              transaction.quantity = parseFloat(value) || 0
              break
            case 'price':
              transaction.price = parseFloat(value) || 0
              break
            case 'brokerage':
              transaction.brokerage = parseFloat(value) || 0
              break
            case 'source':
              transaction.source = value
              break
            case 'remarks':
              transaction.remarks = value
              break
            case 'orderRef':
              transaction.orderRef = value
              break
          }
        }
      })

      // Validation
      if (!transaction.userid) {
        transaction.errors.push('User ID is required')
        transaction.isValid = false
      }
      if (!transaction.date) {
        transaction.errors.push('Date is required')
        transaction.isValid = false
      }
      if (!transaction.stock) {
        transaction.errors.push('Stock symbol is required')
        transaction.isValid = false
      }
      if (transaction.quantity <= 0) {
        transaction.errors.push('Quantity must be positive')
        transaction.isValid = false
      }
      if (transaction.price <= 0) {
        transaction.errors.push('Price must be positive')
        transaction.isValid = false
      }

      // Calculate trade value
      transaction.tradeValue = transaction.quantity * transaction.price

      data.push(transaction)
    }

    return data
  }

  // Bulk upload submission
  const handleBulkUpload = async () => {
    const validTransactions = parsedData.filter(t => t.isValid)
    if (validTransactions.length === 0) {
      toast({
        title: 'Error',
        description: 'No valid transactions to upload',
        variant: 'destructive',
      })
      return
    }

    setUploadLoading(true)
    setUploadProgress(0)

    try {
      const batchSize = 10
      const batches = []
      for (let i = 0; i < validTransactions.length; i += batchSize) {
        batches.push(validTransactions.slice(i, i + batchSize))
      }

      let uploadedCount = 0
      for (const batch of batches) {
        const promises = batch.map(async (transaction) => {
          const response = await fetch('/api/stocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...transaction,
              date: new Date(transaction.date),
            }),
          })
          
          if (!response.ok) {
            throw new Error(`Failed to upload transaction for ${transaction.stock}`)
          }
          
          uploadedCount++
          setUploadProgress((uploadedCount / validTransactions.length) * 100)
        })

        await Promise.all(promises)
      }

      toast({
        title: 'Success',
        description: `${uploadedCount} transactions uploaded successfully`,
      })
      
      // Reset states
      setFile(null)
      setParsedData([])
      setUploadProgress(0)
      
      router.push('/transactions')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload some transactions',
        variant: 'destructive',
      })
    } finally {
      setUploadLoading(false)
    }
  }

  // Download sample CSV
  const downloadSampleCSV = () => {
    const headers = ['userid', 'date', 'stock', 'action', 'source', 'quantity', 'price', 'brokerage', 'remarks', 'order_ref']
    const sampleData = [
      ['GRS', '2024-01-15', 'RELIANCE', 'Buy', 'Demat', '10', '2500.50', '25.00', 'Sample transaction', 'REF001'],
      ['GRS', '2024-01-16', 'TCS', 'Buy', 'Demat', '5', '3200.75', '20.00', 'Another sample', 'REF002']
    ]
    
    const csvContent = [headers, ...sampleData].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_transactions.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const validCount = parsedData.filter(t => t.isValid).length
  const invalidCount = parsedData.filter(t => !t.isValid).length

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Add Stock Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Single Transaction
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Bulk Upload
              </TabsTrigger>
            </TabsList>

            {/* Single Transaction Tab */}
            <TabsContent value="single" className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="userid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60 overflow-y-auto">
                            {accounts.map((account: any) => (
                              <SelectItem key={account.userid} value={account.userid}>
                                {account.userid} - {account.name}
                              </SelectItem>
                            ))}
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
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="stock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock Symbol</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., RELIANCE" {...field} />
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
                          <FormLabel>Transaction Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
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
                  </div>

                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Demat, Physical" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
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
                          <FormLabel>Price per Share</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="brokerage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brokerage</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="orderRef"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Order Reference</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm font-medium">Trade Value</p>
                    <p className="text-2xl font-bold">{formatCurrency(tradeValue)}</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional notes..."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-4">
                    <Button type="submit" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add Transaction
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/')}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            {/* Bulk Upload Tab */}
            <TabsContent value="bulk" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Upload CSV/Excel File</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload multiple transactions at once using a CSV or Excel file
                    </p>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your CSV file should include columns: userid, date, stock, action, source, quantity, price, brokerage, remarks, order_ref.
                    Date format should be YYYY-MM-DD or DD/MM/YYYY.
                  </AlertDescription>
                </Alert>

                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={uploadLoading}
                  />
                </div>

                {uploadLoading && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Processing file...</span>
                    </div>
                  </div>
                )}

                {parsedData.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Badge variant="default" className="flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        {validCount} Valid
                      </Badge>
                      {invalidCount > 0 && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <X className="h-3 w-3" />
                          {invalidCount} Invalid
                        </Badge>
                      )}
                    </div>

                    <div className="border rounded-lg max-h-96 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Status</TableHead>
                            <TableHead>User ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Trade Value</TableHead>
                            <TableHead>Errors</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedData.map((transaction, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                {transaction.isValid ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <X className="h-4 w-4 text-red-600" />
                                )}
                              </TableCell>
                              <TableCell>{transaction.userid}</TableCell>
                              <TableCell>{transaction.date}</TableCell>
                              <TableCell>{transaction.stock}</TableCell>
                              <TableCell>
                                <Badge variant={transaction.action === 'Buy' ? 'default' : 'secondary'}>
                                  {transaction.action}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{transaction.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(transaction.price)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(transaction.tradeValue || 0)}</TableCell>
                              <TableCell>
                                {transaction.errors.length > 0 && (
                                  <div className="text-xs text-red-600">
                                    {transaction.errors.join(', ')}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {uploadProgress > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Uploading transactions...</span>
                          <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <Button 
                        onClick={handleBulkUpload}
                        disabled={validCount === 0 || uploadLoading}
                      >
                        {uploadLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Upload {validCount} Valid Transactions
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setFile(null)
                          setParsedData([])
                          setUploadProgress(0)
                        }}
                        disabled={uploadLoading}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}