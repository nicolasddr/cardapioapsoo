'use client'

import { OptionGroup } from '@/src/domain/entities/OptionGroup'
import { Option } from '@/src/domain/entities/Option'
import { CartItemOption } from '@/src/types/cart'

interface OptionGroupSectionProps {
  group: OptionGroup
  options: Option[]
  selectedOptions: CartItemOption[]
  onSelectionChange: (optionId: string, selected: boolean) => void
}

export function OptionGroupSection({
  group,
  options,
  selectedOptions,
  onSelectionChange,
}: OptionGroupSectionProps) {
  const isSingle = group.getSelectionType() === 'single'
  const selectedOptionIds = selectedOptions
    .filter((opt) => opt.optionGroupId === group.id)
    .map((opt) => opt.optionId)

  const handleRadioChange = (optionId: string) => {
    const option = options.find((opt) => opt.id === optionId)
    if (!option) return

    selectedOptions.forEach((selected) => {
      if (selected.optionGroupId === group.id) {
        onSelectionChange(selected.optionId, false)
      }
    })
    onSelectionChange(optionId, true)
  }

  const handleCheckboxChange = (optionId: string, checked: boolean) => {
    onSelectionChange(optionId, checked)
  }

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-gray-900">{group.getName()}</h3>
      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = selectedOptionIds.includes(option.id)
          const inputId = `option-${option.id}`

          return (
            <label
              key={option.id}
              htmlFor={inputId}
              className="flex items-start gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
            >
              {isSingle ? (
                <input
                  type="radio"
                  id={inputId}
                  name={`group-${group.id}`}
                  checked={isSelected}
                  onChange={() => handleRadioChange(option.id)}
                  className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                />
              ) : (
                <input
                  type="checkbox"
                  id={inputId}
                  checked={isSelected}
                  onChange={(e) =>
                    handleCheckboxChange(option.id, e.target.checked)
                  }
                  className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900">
                  {option.getName()}
                </span>
                <span className="text-sm text-gray-600 ml-2">
                  {option.getDisplayPrice()}
                </span>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}

