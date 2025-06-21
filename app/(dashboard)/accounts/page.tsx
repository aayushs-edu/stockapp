'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Plus, TrendingUp, TrendingDown, DollarSign, BarChart3, Package, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  userid: z.string().min(1, 'User ID is required').max(50),
  name: z.string().min(1, 'Name is required').max(100),
  active: z.boolean().default(true),
})

interface AccountStats {
  totalTransactions: number
  buyTransactions: number
  sellTransactions: number
  totalInvestment: number
  totalReturns: number
  realizedPnL: number
  currentInvestment: number
  activeStocks: number
  totalStocks: number
}

interface Account {
  id: number
  userid: string
  name: string
  active: boolean
  stats?: AccountStats
}

// Helper component for P/L/I display
const PLIDisplay = ({ value, type }: { value: number, type: 'profit' | 'loss' | 'investment' }) => {
  const getColorClass = () => {
    switch (type) {
      case 'profit': return 'text-emerald-600 dark:text-emerald-400'
      case 'loss': return 'text-red-600 dark:text-red-400'
      case 'investment': return 'text-amber-600 dark:text-amber-400'
    }
  }

  const getPrefix = () => {
    switch (type) {
      case 'profit': return '+'
      case 'loss': return '-'
      case 'investment': return ''
    }
  }

  return (
    <span className={getColorClass()}>
      {getPrefix()}{formatCurrency(Math.abs(value))}
    </span>
  )
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deleteAccountId, setDeleteAccountId] = useState<number | null>(null)
  const [toggleLoading, setToggleLoading] = useState<number | null>(null)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userid: '',
      name: '',
      active: true,
    },
  })

  useEffect(() => {
    fetchAccounts()
  }, [])

  useEffect(() => {
    if (editingAccount) {
      form.setValue('userid', editingAccount.userid)
      form.setValue('name', editingAccount.name)
      form.setValue('active', editingAccount.active)
    } else {
      form.reset()
    }
  }, [editingAccount, form])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (!response.ok) {
        throw new Error('Failed to fetch accounts')
      }
      const data = await response.json()
      setAccounts(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch accounts',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    try {
      const url = editingAccount 
        ? `/api/accounts/${editingAccount.id}`
        : '/api/accounts'
      
      const method = editingAccount ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${editingAccount ? 'update' : 'create'} account`)
      }

      toast({
        title: 'Success',
        description: `Account ${editingAccount ? 'updated' : 'created'} successfully`,
      })
      
      setDialogOpen(false)
      setEditingAccount(null)
      form.reset()
      fetchAccounts()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${editingAccount ? 'update' : 'create'} account`,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (accountId: number) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete account')
      }

      toast({
        title: 'Success',
        description: 'Account deleted successfully',
      })
      
      fetchAccounts()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete account',
        variant: 'destructive',
      })
    } finally {
      setDeleteAccountId(null)
    }
  }

  const toggleAccountStatus = async (account: Account) => {
    setToggleLoading(account.id)
    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: account.name,
          active: !account.active,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update account status')
      }

      toast({
        title: 'Success',
        description: `Account ${!account.active ? 'activated' : 'deactivated'} successfully`,
      })
      
      fetchAccounts()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update account status',
        variant: 'destructive',
      })
    } finally {
      setToggleLoading(null)
    }
  }

  // Calculate summary stats
  const summaryStats = accounts.reduce((acc, account) => {
    if (account.stats) {
      acc.totalInvestment += account.stats.totalInvestment
      acc.totalReturns += account.stats.totalReturns
      acc.realizedPnL += account.stats.realizedPnL
      acc.currentInvestment += account.stats.currentInvestment
      acc.totalTransactions += account.stats.totalTransactions
    }
    return acc
  }, { 
    totalInvestment: 0, 
    totalReturns: 0, 
    realizedPnL: 0, 
    currentInvestment: 0,
    totalTransactions: 0 
  })

  const activeAccountsCount = accounts.filter(a => a.active).length
  const inactiveAccountsCount = accounts.filter(a => !a.active).length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Accounts</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingAccount(null)
            form.reset()
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Edit Account' : 'Create New Account'}</DialogTitle>
              <DialogDescription>
                {editingAccount ? 'Update the account details' : 'Add a new trading account to the system'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="userid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., GRS" 
                          {...field} 
                          disabled={isSubmitting || !!editingAccount}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Account holder name" 
                          {...field} 
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Account</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Active accounts will appear in dropdown menus
                        </div>
                      </div>
                      <FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => field.onChange(!field.value)}
                          disabled={isSubmitting}
                          className="p-0 h-auto"
                        >
                          {field.value ? (
                            <ToggleRight className="h-6 w-6 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-gray-400" />
                          )}
                        </Button>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false)
                      form.reset()
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingAccount ? 'Update Account' : 'Create Account'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-xs font-medium">Total Accounts</CardTitle>
          <Package className="h-3 w-3 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-lg font-bold">{accounts.length}</div>
          <p className="text-[10px] text-muted-foreground">
            All trading accounts
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-xs font-medium">Active Accounts</CardTitle>
          <Package className="h-3 w-3 text-green-600" />
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-lg font-bold text-green-600">{activeAccountsCount}</div>
          <p className="text-[10px] text-muted-foreground">
            Available in dropdowns
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-xs font-medium">Current Investment</CardTitle>
          <DollarSign className="h-3 w-3 text-amber-600" />
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-lg font-bold text-amber-600">
            {formatCurrency(summaryStats.currentInvestment)}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Active positions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-xs font-medium">Realized P/L</CardTitle>
          {summaryStats.realizedPnL >= 0 ? (
            <TrendingUp className="h-3 w-3 text-emerald-600" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-600" />
          )}
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-lg font-bold">
            <PLIDisplay 
              value={summaryStats.realizedPnL} 
              type={summaryStats.realizedPnL >= 0 ? 'profit' : 'loss'} 
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            From closed positions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-xs font-medium">Total Transactions</CardTitle>
          <BarChart3 className="h-3 w-3 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-lg font-bold">{summaryStats.totalTransactions}</div>
          <p className="text-[10px] text-muted-foreground">
            All time trades
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-xs font-medium">Inactive Accounts</CardTitle>
          <Package className="h-3 w-3 text-gray-400" />
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-lg font-bold text-gray-600">{inactiveAccountsCount}</div>
          <p className="text-[10px] text-muted-foreground">
            Not in dropdowns
          </p>
        </CardContent>
      </Card>
    </div>
    
      <Card>
        <CardHeader>
          <CardTitle>All Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Transactions</TableHead>
                <TableHead className="text-center">Active Stocks</TableHead>
                <TableHead className="text-right">Deployed</TableHead>
                <TableHead className="text-right">Returns</TableHead>
                <TableHead className="text-right">P/L/I</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">
                    No accounts found
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => {
                  // Determine what to show in P/L/I column
                  const hasCurrentInvestment = (account.stats?.currentInvestment || 0) > 0
                  const hasRealizedPnL = (account.stats?.realizedPnL || 0) !== 0
                  
                  let pliDisplay = null
                  if (hasCurrentInvestment && hasRealizedPnL) {
                    // Show both investment and P/L
                    pliDisplay = (
                      <div className="flex flex-col items-end text-xs">
                        <PLIDisplay 
                          value={account.stats?.currentInvestment || 0} 
                          type="investment" 
                        />
                        <PLIDisplay 
                          value={account.stats?.realizedPnL || 0} 
                          type={(account.stats?.realizedPnL || 0) >= 0 ? 'profit' : 'loss'} 
                        />
                      </div>
                    )
                  } else if (hasCurrentInvestment) {
                    // Show only investment
                    pliDisplay = (
                      <PLIDisplay 
                        value={account.stats?.currentInvestment || 0} 
                        type="investment" 
                      />
                    )
                  } else if (hasRealizedPnL) {
                    // Show only P/L
                    pliDisplay = (
                      <PLIDisplay 
                        value={account.stats?.realizedPnL || 0} 
                        type={(account.stats?.realizedPnL || 0) >= 0 ? 'profit' : 'loss'} 
                      />
                    )
                  } else {
                    pliDisplay = '-'
                  }

                  return (
                    <TableRow key={account.id} className={cn(
                      "h-8",
                      !account.active && "opacity-60 bg-muted/20"
                    )}>
                      <TableCell className="font-medium py-1">
                        {account.userid}
                      </TableCell>
                      <TableCell className="py-1">{account.name}</TableCell>
                      <TableCell className="text-center py-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAccountStatus(account)}
                          disabled={toggleLoading === account.id}
                          className="h-8 w-8 p-0"
                        >
                          {toggleLoading === account.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : account.active ? (
                            <ToggleRight className="h-5 w-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center py-1">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-medium">{account.stats?.totalTransactions || 0}</span>
                          {account.stats && account.stats.totalTransactions > 0 && (
                            <div className="flex gap-1 text-xs text-muted-foreground">
                              <span className="text-green-600">{account.stats.buyTransactions} buy</span>
                              <span>•</span>
                              <span className="text-red-600">{account.stats.sellTransactions} sell</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-1">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-medium">{account.stats?.activeStocks || 0}</span>
                          <span className="text-xs text-muted-foreground">
                            of {account.stats?.totalStocks || 0} total
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium py-1">
                        {formatCurrency(account.stats?.totalInvestment || 0)}
                      </TableCell>
                      <TableCell className="text-right py-1">
                        {formatCurrency(account.stats?.totalReturns || 0)}
                      </TableCell>
                      <TableCell className="text-right font-medium py-1">
                        {pliDisplay}
                      </TableCell>
                      <TableCell className="text-center py-1">
                        <div className="flex items-center gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingAccount(account)
                              setDialogOpen(true)
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteAccountId(account.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAccountId} onOpenChange={(open) => !open && setDeleteAccountId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAccountId && handleDelete(deleteAccountId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}