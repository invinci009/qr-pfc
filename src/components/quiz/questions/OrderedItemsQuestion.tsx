'use client'

import { UtensilsCrossed, Check, Plus, Sparkles } from 'lucide-react'

export interface MenuItemData {
  id: string
  name: unknown
}

interface OrderedItemsQuestionProps {
  menuItems: MenuItemData[]
  value: string[]
  onChange: (value: string[]) => void
}

export default function OrderedItemsQuestion({
  menuItems,
  value,
  onChange,
}: OrderedItemsQuestionProps) {
  const toggleItem = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((i) => i !== id))
    } else {
      onChange([...value, id])
    }
  }

  const getItemName = (item: MenuItemData): string => {
    if (typeof item.name === 'string') return item.name
    if (typeof item.name === 'object' && item.name !== null) {
      const obj = item.name as Record<string, unknown>
      return (obj.en as string) || (Object.values(obj)[0] as string) || 'Menu item'
    }
    return 'Menu item'
  }

  return (
    <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="space-y-2.5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          <span className="text-[11px] font-semibold tracking-wider uppercase text-amber-900">
            Question 5 of 6
          </span>
          <span className="text-stone-300">•</span>
          <span className="text-[11px] text-amber-800 font-medium">Optional</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Which dishes did you{' '}
          <span className="bg-gradient-to-r from-amber-700 via-amber-600 to-yellow-600 bg-clip-text text-transparent">
            order today
          </span>
          ?
        </h2>
        <p className="text-sm text-stone-600">
          Select the crispy chicken, burgers, sides, or drinks you enjoyed today
        </p>
      </div>

      {/* Grid of Menu Items */}
      <div
        role="group"
        aria-label="Ordered dishes"
        className="py-2 flex flex-wrap justify-center gap-2.5 max-w-lg mx-auto"
      >
        {menuItems.map((item) => {
          const isSelected = value.includes(item.id)
          const name = getItemName(item)

          return (
            <button
              key={item.id}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => toggleItem(item.id)}
              aria-label={name}
              className={`px-4 py-2.5 min-h-[44px] rounded-full border text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all duration-200 cursor-pointer active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 shadow-xs ${
                isSelected
                  ? 'border-amber-600 bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-600/20'
                  : 'border-stone-200 bg-stone-50/70 text-stone-700 hover:bg-white hover:border-amber-300 hover:text-stone-900'
              }`}
            >
              {isSelected ? (
                <Check className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <Plus className="w-3.5 h-3.5 text-stone-400" />
              )}
              <span>{name}</span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-400">
        <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
        <span>Tap multiple items if you shared a meal</span>
      </div>
    </div>
  )
}
