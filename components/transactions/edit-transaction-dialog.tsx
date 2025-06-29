'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

const formSchema = z.object({
  date: z.date({
    required_error: "Date is required",
  }),
  stock: z.string().min(1, "Stock is required"),
  action: z.enum(['Buy', 'Sell']),
  source: z.string().optional(),
  quantity: z.number().positive("Quantity must be positive"),
  price: z.number().positive("Price must be positive"),
  tradeValue: z.number().positive("Trade value must be positive"),
  brokerage: z.number().min(0, "Brokerage cannot be negative"),
  orderRef: z.string().optional(),
  remarks: z.string().optional(),
})

type Transaction = {
  id: number
  userid: string
  date: string
  stock: string
  action: string
  source: string | null
  quantity: number
  price: number
  tradeValue: number
  brokerage: number
  orderRef: string | null
  remarks: string | null
}

interface EditTransactionDialogProps {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditTransactionDialog({
  transaction,
  open,
  onOpenChange,
  onSuccess
}: EditTransactionDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      stock: '',
      action: 'Buy',
      source: '',
      quantity: 0,
      price: 0,
      tradeValue: 0,
      brokerage: 0,
      orderRef: '',
      remarks: '',
    },
  })

  // Reset form when transaction changes
  useEffect(() => {
    if (transaction) {
      form.reset({
        date: new Date(transaction.date),
        stock: transaction.stock,
        action: transaction.action as 'Buy' | 'Sell',
        source: transaction.source || '',
        quantity: transaction.quantity,
        price: transaction.price,
        tradeValue: transaction.tradeValue,
        brokerage: transaction.brokerage,
        orderRef: transaction.orderRef || '',
        remarks: transaction.remarks || '',
      })
    }
  }, [transaction, form])

  // Auto-calculate trade value when quantity or price changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'quantity' || name === 'price') {
        const quantity = value.quantity || 0
        const price = value.price || 0
        const tradeValue = Math.round(quantity * price * 100) / 100
        form.setValue('tradeValue', tradeValue)
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!transaction) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/stocks/${transaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          date: format(values.date, 'yyyy-MM-dd'),
          userid: transaction.userid,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update transaction')
      }

      toast({
        title: "Success",
        description: "Transaction updated successfully",
      })
      
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!transaction) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transaction #{transaction.id}</DialogTitle>
          <DialogDescription>
            Make changes to your transaction. The form will auto-calculate trade value.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Date Field */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal h-9",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd-MMM-yy")
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

              {/* Stock Field */}
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Stock</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action Field */}
              <FormField
                control={form.control}
                name="action"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Action</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select action" />
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

              {/* Source Field */}
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Source</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., NSE, BSE" className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quantity Field */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Price Field */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Price per Share</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Trade Value Field (Auto-calculated) */}
              <FormField
                control={form.control}
                name="tradeValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Trade Value</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        className="h-9 bg-muted/50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Brokerage Field */}
              <FormField
                control={form.control}
                name="brokerage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Brokerage</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Order Reference Field */}
              <FormField
                control={form.control}
                name="orderRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Order Reference</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Remarks Field - Full Width */}
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={2}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}