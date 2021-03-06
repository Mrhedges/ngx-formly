import { FormlyExtension } from '../../services/formly.config';
import { FormlyFieldConfigCache } from '../../components/formly.field.config';
import { AbstractControl, FormGroup, FormArray, FormControl, AbstractControlOptions } from '@angular/forms';
import { getKeyPath, defineHiddenProp, getFieldValue } from '../../utils';
import { registerControl } from './utils';

/** @experimental */
export class FieldFormExtension implements FormlyExtension {
  onPopulate(field: FormlyFieldConfigCache) {
    if (field.key && field.type) {
      this.addFormControl(field);
    }

    if (field.fieldGroup && !field.formControl) {
      field.formControl = field.parent.formControl;
    }
  }

  private addFormControl(field: FormlyFieldConfigCache) {
    if (!field.formControl) {
      defineHiddenProp(field, 'formControl', field.formControl);
    }

    const controlOptions: AbstractControlOptions = {
      validators: field._validators,
      asyncValidators: field._asyncValidators,
      updateOn: field.modelOptions.updateOn,
    };
    let control: AbstractControl;

    const form = field.parent.formControl as FormGroup;
    const value = getFieldValue(field);
    const paths = getKeyPath(field);
    if (field.formControl instanceof AbstractControl || form.get(paths)) {
      control = field.formControl || form.get(paths);
      if (
        (controlOptions.validators !== control.validator)
        || (controlOptions.asyncValidators !== control.asyncValidator)
      ) {
        if (controlOptions.validators !== control.validator) {
          control.setValidators(controlOptions.validators);
        }
        if (controlOptions.asyncValidators !== control.asyncValidator) {
          control.setAsyncValidators(controlOptions.asyncValidators);
        }
        control.updateValueAndValidity();
      }
    } else if (field._componentFactory && field._componentFactory.component && field._componentFactory.component.createControl) {
      const component = field._componentFactory.component;
      console.warn(`NgxFormly: '${component.name}::createControl' is deprecated since v5.0, use 'prePopulate' hook instead.`);
      control = component.createControl(value, field);
    } else if (field.fieldGroup && !field.fieldArray) {
      control = new FormGroup({}, controlOptions);
    } else if (field.fieldArray) {
      control = new FormArray([], controlOptions);
    } else {
      control = new FormControl(value, controlOptions);
    }

    if (field.templateOptions.disabled) {
      control.disable();
    }

    // Replace decorated property with a getter that returns the observable.
    // https://github.com/angular-redux/store/blob/master/src/decorators/select.ts#L79-L85
    if (delete field.templateOptions.disabled) {
      Object.defineProperty(field.templateOptions, 'disabled', {
        get: () => !field.formControl.enabled,
        set: (value: boolean) => value ? field.formControl.disable() : field.formControl.enable(),
        enumerable: true,
        configurable: true,
      });
    }

    field.formControl = control;
    registerControl(field);
  }
}
