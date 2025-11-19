'use client'

import * as React from "react"
import { PhoneInput as BasePhoneInput } from 'react-international-phone'
import 'react-international-phone/style.css'
import { cn } from "@/lib/utils"

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  onChange?: (value: string) => void
  value?: string
  defaultCountry?: string
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, onChange, value, defaultCountry = 'ru', ...props }, ref) => {
    const handleChange = (phone: string) => {
      if (onChange) {
        // Создаем синтетическое событие для совместимости с react-hook-form
        const event = {
          target: { value: phone },
          currentTarget: { value: phone },
        } as React.ChangeEvent<HTMLInputElement>

        // Если onChange принимает строку (новый API)
        if (onChange.length === 1) {
          (onChange as (value: string) => void)(phone)
        } else {
          // Если onChange принимает event (старый API для обратной совместимости)
          (onChange as (event: React.ChangeEvent<HTMLInputElement>) => void)(event)
        }
      }
    }

    return (
      <BasePhoneInput
        {...props}
        ref={ref as any}
        value={value || ''}
        onChange={handleChange}
        defaultCountry={defaultCountry}
        inputClassName={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        countrySelectorStyleProps={{
          buttonClassName: cn(
            "border-input hover:bg-accent hover:text-accent-foreground rounded-l-md"
          ),
          dropdownStyleProps: {
            className: "bg-popover text-popover-foreground rounded-md border border-input shadow-md z-50"
          }
        }}
      />
    )
  }
)

PhoneInput.displayName = "PhoneInput"

export { PhoneInput }
