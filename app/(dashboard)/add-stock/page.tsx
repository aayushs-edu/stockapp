// app/(dashboard)/add-stock/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Loader2, Upload, FileText, Plus, Download, AlertCircle, Check, X } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
  const { activeAccounts, loading: accountsLoading } = useAccounts()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('single')
  
  // Bulk upload states
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([])
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previousValues, setPreviousValues] = useState<z.infer<typeof formSchema> | null>(null)
  
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
      setPreviousValues(values) // Save the just-submitted values
      
      // Always reset form but keep only the account selected
      form.reset({
        userid: values.userid, // Keep the account
        // All other fields will be cleared (undefined/empty)
        date: undefined,
        stock: '',
        action: 'Buy',
        source: '',
        quantity: 0,
        price: 0,
        brokerage: 0,
        remarks: '',
        orderRef: '',
      })

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

  // CSV parsing function - updated to not expect headers
  const parseCSV = (text: string): ParsedTransaction[] => {
    const lines = text.trim().split('\n')
    if (lines.length < 1) return []

    const data: ParsedTransaction[] = []

    // Process each line as data (no header row expected)
    for (let i = 0; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length < 7) continue // Skip incomplete lines (minimum required fields)

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

      // Map values directly by position
      // Expected format: userid, date, stock, action, source, quantity, price, brokerage, remarks, orderRef
      try {
        transaction.userid = values[0] ? values[0].toUpperCase() : ''
        transaction.date = values[1] || ''
        transaction.stock = values[2] ? values[2].toUpperCase() : ''
        transaction.action = values[3] && values[3].toLowerCase() === 'sell' ? 'Sell' : 'Buy'
        transaction.source = values[4] || ''
        transaction.quantity = parseFloat(values[5]) || 0
        transaction.price = parseFloat(values[6]) || 0
        transaction.brokerage = parseFloat(values[7]) || 0
        transaction.remarks = values[8] || ''
        transaction.orderRef = values[9] || ''
      } catch (error) {
        transaction.errors.push('Error parsing row data')
        transaction.isValid = false
      }

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

  // Download sample CSV - updated format
  const downloadSampleCSV = () => {
    const sampleData = [
      ['GRS', '2024-01-15', 'RELIANCE', 'Buy', 'Demat', '10', '2500.50', '25.00', 'Sample transaction', 'REF001'],
      ['GRS', '2024-01-16', 'TCS', 'Buy', 'Demat', '5', '3200.75', '20.00', 'Another sample', 'REF002']
    ]
    
    const csvContent = sampleData.map(row => row.join(',')).join('\n')
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
    <div className="max-w-6xl mx-auto">
      <Card>
        <CardHeader className="pb-4">
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
            <TabsContent value="single" className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Row 1: Account, Date, Stock, Action */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="userid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={accountsLoading ? "Loading..." : "Select account"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60 overflow-y-auto">
                              {accountsLoading ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="ml-2 text-sm">Loading accounts...</span>
                                </div>
                              ) : activeAccounts.length === 0 ? (
                                <div className="py-4 text-center text-sm text-muted-foreground">
                                  No active accounts found
                                </div>
                              ) : (
                                activeAccounts.map((account) => (
                                  <SelectItem key={account.userid} value={account.userid}>
                                    {account.userid} - {account.name}
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
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <EnhancedDatePicker
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Select date"
                              className="w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
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

                  {/* Row 2: Source, Quantity, Price, Brokerage */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Demat" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0" {...field} />
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
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="brokerage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brokerage</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Row 3: Order Ref, Trade Value (readonly), Remarks */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                    <div className="space-y-2">
                      <FormLabel>Trade Value</FormLabel>
                      <div className="h-10 px-3 py-2 rounded-md border bg-muted flex items-center">
                        <span className="text-lg font-semibold text-primary">
                          {formatCurrency(tradeValue)}
                        </span>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="remarks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Remarks</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional notes" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Form Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center space-x-2">
                      {previousValues && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => form.reset(previousValues)}
                        >
                          Restore Previous Values
                        </Button>
                      )}
                    </div>

                    <Button type="submit" disabled={loading || accountsLoading} className="min-w-[140px]">
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add Transaction
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            {/* Bulk Upload Tab */}
            <TabsContent value="bulk" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Upload CSV/Excel File</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload multiple transactions at once
                    </p>
                  </div>
                  <Button variant="outline" onClick={downloadSampleCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Sample
                  </Button>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>CSV Format (no headers):</strong> userid, date, stock, action, source, quantity, price, brokerage, remarks, orderRef<br />
                    <strong>Example:</strong> GRS,2024-01-15,RELIANCE,Buy,Demat,10,2500.50,25.00,Sample,REF001
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

                {uploadLoading && !parsedData.length && (
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

                    <div className="border rounded-lg max-h-64 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="h-8">
                            <TableHead className="w-12 py-1">Status</TableHead>
                            <TableHead className="py-1">User ID</TableHead>
                            <TableHead className="py-1">Date</TableHead>
                            <TableHead className="py-1">Stock</TableHead>
                            <TableHead className="py-1">Action</TableHead>
                            <TableHead className="text-right py-1">Quantity</TableHead>
                            <TableHead className="text-right py-1">Price</TableHead>
                            <TableHead className="text-right py-1">Trade Value</TableHead>
                            <TableHead className="py-1">Errors</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedData.map((transaction, index) => (
                            <TableRow key={index} className="h-6">
                              <TableCell className="py-0.5">
                                {transaction.isValid ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <X className="h-3 w-3 text-red-600" />
                                )}
                              </TableCell>
                              <TableCell className="py-0.5 text-xs">{transaction.userid}</TableCell>
                              <TableCell className="py-0.5 text-xs">{transaction.date}</TableCell>
                              <TableCell className="py-0.5 text-xs">{transaction.stock}</TableCell>
                              <TableCell className="py-0.5">
                                <Badge variant={transaction.action === 'Buy' ? 'default' : 'secondary'} className="text-xs h-4">
                                  {transaction.action}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right py-0.5 text-xs">{transaction.quantity}</TableCell>
                              <TableCell className="text-right py-0.5 text-xs">{formatCurrency(transaction.price)}</TableCell>
                              <TableCell className="text-right py-0.5 text-xs">{formatCurrency(transaction.tradeValue || 0)}</TableCell>
                              <TableCell className="py-0.5">
                                {transaction.errors.length > 0 && (
                                  <div className="text-xs text-red-600 max-w-[120px] truncate">
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