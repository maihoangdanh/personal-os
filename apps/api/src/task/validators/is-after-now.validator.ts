import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Business rule (02_Business_Rules / 04_API_Spec):
 * "Deadline phải lớn hơn ngày tạo." — the deadline must be strictly in the future
 * relative to now (the creation moment). Applied to optional ISO date strings.
 */
export function IsAfterNow(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAfterNow',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (value === undefined || value === null) {
            return true; // optional
          }
          const date = new Date(value as string);
          if (Number.isNaN(date.getTime())) {
            return false;
          }
          return date.getTime() > Date.now();
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a future date (greater than now)`;
        },
      },
    });
  };
}
