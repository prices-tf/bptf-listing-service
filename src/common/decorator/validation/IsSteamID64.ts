import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

import SteamID from 'steamid';

@ValidatorConstraint()
export class IsSteamID64Constraint implements ValidatorConstraintInterface {
  validate(steamid64: any) {
    try {
      const steamid = new SteamID(steamid64);
      return steamid.isValid();
    } catch (err) {
      return false;
    }
  }
}

export function IsSteamID64(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: Object.assign(
        {
          message: propertyName + ' must be a SteamID64',
        },
        validationOptions,
      ),
      constraints: [],
      validator: IsSteamID64Constraint,
    });
  };
}
