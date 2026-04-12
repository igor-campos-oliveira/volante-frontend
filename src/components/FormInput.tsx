import { ControllerRenderProps, RegisterOptions, UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { cloneElement, ReactElement } from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface FormInputProps{
    name:  string,
    label?: string,
    placeholder?: string,
    className?: string,
    type?: string,
    form: UseFormReturn<any>
    rules?: RegisterOptions
    showValidationColors?: boolean
    children?: (field:  ControllerRenderProps<any, string>) => ReactElement<any>
}

const FormInput = ({name, label, form, children, className, rules, showValidationColors = false}: FormInputProps) => {
    return ( 
    <FormField name={name} control={form.control} rules={rules} render={({field, fieldState}) => {
        const hasValue = typeof field.value === "string"
          ? field.value.trim().length > 0
          : field.value !== undefined && field.value !== null && field.value !== "";

        const showSuccessState = showValidationColors && hasValue && !fieldState.invalid;
        const showErrorState = showValidationColors && hasValue && fieldState.invalid;

        const inputStatusClassName = cn(
          showSuccessState && "border-green-500 focus-visible:ring-green-500",
          showErrorState && "border-red-500 focus-visible:ring-red-500"
        );

        const labelStatusClassName = cn(
          showSuccessState && "text-green-600",
          showErrorState && "text-red-600"
        );

        const childElement = children && children(field);
        const childWithValidationStyle = childElement
          ? cloneElement(childElement, {
              className: cn(childElement.props.className, inputStatusClassName),
            })
          : null;

        return (
        <FormItem className={className}>
            {label && <FormLabel className={labelStatusClassName}>{label}</FormLabel>}
            <FormControl>
                {childWithValidationStyle}
            </FormControl>
            <FormMessage/>
        </FormItem>
      )
    }}/>
    );
}

interface FormSelectProps extends FormInputProps {
    options: FormSelectOption[]
}

type FormSelectOption = {value: string, label: string, color?: string}

const FormSelect = ({name, label, form, options, placeholder, className}: FormSelectProps) => {
    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
            <FormItem className={className}>
                {label && <FormLabel>{label}</FormLabel>}
                <span>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder={placeholder} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {options && options.map((option: FormSelectOption) => (
                                <SelectItem key={option.value} value={option.value}>
                                    <span className="flex items-center">
                                        {option?.color && <div className={`w-3 h-3 rounded-full mr-1 ${option.color}`}></div>}
                                        {option.label}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </span>
            </FormItem>
            )}
        />
    )
}
 
export { FormSelect, FormInput };
