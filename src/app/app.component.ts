import { Component } from '@angular/core';
import { FormBuilderComponent } from './form-builder/form-builder.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormBuilderComponent],
  template: `<app-form-builder />`,
  styles: [`
    :host {
      display: block;
      height: 100vh;
    }
  `]
})
export class AppComponent {}
