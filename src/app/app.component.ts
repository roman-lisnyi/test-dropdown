import {Component, OnInit} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {DropdownComponent} from './shared';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {IDropdownOption} from './shared/intefaces';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, DropdownComponent, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  form = new FormGroup({
    control1: new FormControl(null, [Validators.required]),
    control2: new FormControl(2, [Validators.required]),
  })
  options: IDropdownOption[] = Array.from({length: 15}, (_, i) => i + 1).map(id => ({
    id,
    label: id === 3 ? `Looooooooooong looooooooooong label ${id}` : `Label ${id}`,
  }))
  options5: IDropdownOption[] = Array.from({length: 5}, (_, i) => i + 1).map(id => ({
    id,
    label: `Label ${id}`,
  }))

  valueFn = (option: IDropdownOption) => option;

  ngOnInit() {
    this.listenForm();
  }

  listenForm() {
    this.form.valueChanges.subscribe(value => {
      console.log('FORM CHANGED', value);
    })
  }

  optionSelected(value: any) {
    console.log('VALUE SELECTED', value);
  }
}
