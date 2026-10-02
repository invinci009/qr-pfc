'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Utensils, Plus, Trash2, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export interface MenuItem {
  id: string
  name: any
  active: boolean | null
  position: number | null
}

interface MenuTabProps {
  menuItems: MenuItem[]
  onRefresh: () => void
}

export default function MenuTab({ menuItems, onRefresh }: MenuTabProps) {
  const [dishName, setDishName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddDish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dishName.trim()) return

    setIsAdding(true)
    setError(null)

    try {
      const res = await fetch('/api/business/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: dishName.trim() }),
      })

      if (res.ok) {
        setDishName('')
        onRefresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to add dish')
      }
    } catch {
      setError('Connection error')
    } finally {
      setIsAdding(false)
    }
  }

  const handleToggleDish = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/business/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !currentActive }),
      })
      if (res.ok) onRefresh()
    } catch (e) {
      console.error('Toggle dish error:', e)
    }
  }

  const handleDeleteDish = async (id: string) => {
    if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to delete this menu dish?')) return
    setError(null)
    try {
      const res = await fetch(`/api/business/menu?id=${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        onRefresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to delete dish')
      }
    } catch (e) {
      console.error('Delete dish error:', e)
      setError('Connection error while deleting dish')
    }
  }

  const getDishName = (item: MenuItem): string => {
    if (typeof item.name === 'string') return item.name
    if (typeof item.name === 'object' && item.name !== null) {
      return item.name.en || Object.values(item.name)[0] || 'Dish'
    }
    return 'Dish'
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Menu Items (Quiz Q5)</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Dishes listed here appear as selectable chips in Question 5 of the diner quiz
        </p>
      </div>

      {/* Add New Dish Card */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white">Add Specialty Dish</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Popular chicken buckets, burgers, popcorn, wings, or beverages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddDish} className="flex gap-3">
            <Input
              placeholder="e.g. Crispy Fried Chicken, Zinger Burger, Hot Wings..."
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              className="bg-slate-950/60 border-slate-800 text-white h-10 text-xs flex-1"
            />
            <Button
              type="submit"
              disabled={isAdding || !dishName.trim()}
              className="bg-gradient-to-r from-rose-500 to-amber-500 text-white text-xs font-semibold h-10 px-5 rounded-xl shadow-md shadow-rose-500/20 cursor-pointer shrink-0"
            >
              {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Add Dish
            </Button>
          </form>
          {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}
        </CardContent>
      </Card>

      {/* Dishes List */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
        <CardHeader className="pb-3 border-b border-slate-800">
          <CardTitle className="text-sm text-white">Active Quiz Menu Items ({menuItems.length})</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            {menuItems.length === 0
              ? 'Currently 0 dishes added — Question 5 will be automatically hidden from customer quizzes until you add at least 1 dish.'
              : 'Diners can pick these items during Question 5.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {menuItems.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              <Utensils className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p>No dishes added yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {menuItems.map((item) => {
                const name = getDishName(item)
                const isActive = item.active !== false

                return (
                  <div key={item.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                        <Utensils className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-500 line-through'}`}>
                          {name}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {isActive ? 'Visible in quiz' : 'Hidden from quiz'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleDish(item.id, isActive)}
                        className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                          isActive
                            ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                            : 'border-slate-700 text-slate-500 hover:bg-slate-800'
                        }`}
                        title={isActive ? 'Deactivate Dish' : 'Activate Dish'}
                      >
                        {isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDish(item.id)}
                        className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors cursor-pointer"
                        title="Delete Dish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
