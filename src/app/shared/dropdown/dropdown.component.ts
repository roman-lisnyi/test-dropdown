import {
  ChangeDetectionStrategy,
  Component, effect,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  signal,
  TemplateRef,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule} from '@angular/forms';
import {TemplatePortal} from '@angular/cdk/portal';
import {Overlay, OverlayModule, OverlayRef} from '@angular/cdk/overlay';
import {IDropdownOption} from '../intefaces';

@Component({
  selector: 'stp-dropdown',
  standalone: true,
  templateUrl: './dropdown.component.html',
  styleUrl: './dropdown.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: DropdownComponent,
      multi: true,
    },
  ],
  imports: [CommonModule, OverlayModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DropdownComponent<T> implements ControlValueAccessor, OnDestroy {
  @Input() options: IDropdownOption<T>[] = [];
  @Input() optional = false;
  @Input() placeholder: string = 'Select an option';
  @Input() set selected(value: IDropdownOption<T> | T | null) {
    this.writeValue(value);
  }
  @Input() valueFn: (value: IDropdownOption<T> | null) => IDropdownOption<T> | T | null = (value: IDropdownOption<T> | null) => value?.id || null;
  @Output() selectedChange = new EventEmitter<IDropdownOption<T> | T | null>();

  @ViewChild('trigger') trigger!: ElementRef;
  @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
  @ViewChild('dropdownList') dropdownList!: ElementRef;
  @ViewChild('scrollbar') scrollbar!: ElementRef;
  @ViewChild('dropdownMenu') dropdownMenu!: ElementRef;

  selectedOption = signal<IDropdownOption<T> | T | null>(null);
  selectedOptionId = signal<T | null>(null);
  selectedOptionLabel = signal<string | null>(null);
  triggerWidth = signal<number>(0);
  overlayRef = signal<OverlayRef | null>(null);

  constructor(private overlay: Overlay,
              private viewContainerRef: ViewContainerRef) {
    effect(() => {
      const selected = this.selectedOption();
      this.defineLabel(selected);
    }, {allowSignalWrites: true});
  }

  private onChange = (value: IDropdownOption<T> | T | null) => {
  };
  private onTouched = () => {
  };

  writeValue(value: IDropdownOption<T> | T | null): void {
    this.selectedOption.set(value);

    this.defineLabel(value);
  }

  defineLabel(value: IDropdownOption<T> | T | null) {
    const selectedOption = this.options.find((option) => option.id === (+(value as IDropdownOption<T>)?.id || value));
    this.selectedOptionLabel.set(selectedOption?.label || null);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    if (isDisabled) {
      this.trigger?.nativeElement.setAttribute('disabled', 'true');
    } else {
      this.trigger?.nativeElement.removeAttribute('disabled');
    }
  }

  ngOnDestroy(): void {
    this.closeDropdown();
  }

  toggleDropdown(): void {
    if (!this.options?.length) return;

    if (this.overlayRef()) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown(): void {
    const triggerRect = this.trigger.nativeElement.getBoundingClientRect();
    this.triggerWidth.set(triggerRect.width);

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.trigger)
      .withPositions([
        {
          originX: 'start',
          originY: 'bottom',
          overlayX: 'start',
          overlayY: 'top',
        },
      ]);

    this.overlayRef.set(this.overlay.create({
      hasBackdrop: true,
      positionStrategy,
      backdropClass: 'transparent-bg'
    }));

    const portal = new TemplatePortal(this.dropdownTemplate, this.viewContainerRef);
    this.overlayRef()?.attach(portal);

    this.menuLoadedCheck(() => {
      this.animateDropdownMenu();
      this.optionsScroll();
    })

    if (this.overlayRef()?.backdropClick) {
      this.overlayRef()?.backdropClick().subscribe(() => this.closeDropdown());
    }
  }

  closeDropdown(): void {
    if (this.overlayRef) {
      this.overlayRef()?.dispose();
      this.overlayRef.set(null);
      this.optionsScroll(true);
    }
  }

  selectOption(option: IDropdownOption<T> | null): void {
    const value = this.valueFn(option);
    this.selectedOptionId.set(option ? option.id : null)
    this.selectedOption.set(value);
    this.onChange(value);
    this.selectedChange.emit(value);
    this.closeDropdown();
  }

  updateCustomScrollbar() {
    const dropdown = this.dropdownList.nativeElement;
    const scrollbar = this.scrollbar.nativeElement;

    const {scrollHeight, clientHeight, scrollTop} = dropdown;

    if (scrollHeight <= clientHeight) {
      this.dropdownMenu.nativeElement.classList.add('no-scroll');
      scrollbar.style.height = '0px';
      scrollbar.style.transform = 'translateY(0px)';
      return;
    }

    const scrollbarHeight = (clientHeight / scrollHeight) * clientHeight;

    scrollbar.style.height = `${scrollbarHeight}px`;
    scrollbar.style.transform = `translateY(${(scrollTop / (scrollHeight - clientHeight)) * (clientHeight - scrollbarHeight) + 10}px)`;
  }

  animateDropdownMenu() {
    this.dropdownMenu.nativeElement.classList.add('animated');
  }

  optionsScroll(destroy = false) {
    if (destroy) {
      this.dropdownList.nativeElement.removeEventListener('scroll', () => this.updateCustomScrollbar());
    } else {
      this.updateCustomScrollbar();
      this.dropdownList.nativeElement.addEventListener('scroll', () => this.updateCustomScrollbar());
    }
  }

  menuLoadedCheck(cb: () => void) {
    let elapsed = 0;
    const interval = 50;
    const timeout = 2000;

    const checkInterval = setInterval(() => {
      elapsed += interval;
      if (this.dropdownList?.nativeElement && this.dropdownMenu?.nativeElement) {
        cb();
        clearInterval(checkInterval);
      } else if (elapsed >= timeout) {
        clearInterval(checkInterval);
      }
    }, interval);
  }

  /**
   * Accessibility
   */

  keyDownOpenMenu(event: Event): void {
    event.preventDefault();
    this.toggleDropdown();
    setTimeout(() => {
      this.focusFirstOption();
    }, 0)
  }

  focusFirstOption(): void {
    const options = this.dropdownList.nativeElement.querySelectorAll('li');
    if (options.length > 0) {
      (options[0] as HTMLElement).focus();
    }
  }

  focusNextOption(event: Event): void {
    const current = event.target as HTMLElement;
    const options = Array.from(this.dropdownList.nativeElement.querySelectorAll('li'));
    const currentIndex = options.indexOf(current);
    if (currentIndex < options.length - 1) {
      (options[currentIndex + 1] as HTMLElement).focus();
    }
  }

  focusPreviousOption(event: Event): void {
    const current = event.target as HTMLElement;
    const options = Array.from(this.dropdownList.nativeElement.querySelectorAll('li'));
    const currentIndex = options.indexOf(current);
    if (currentIndex > 0) {
      (options[currentIndex - 1] as HTMLElement).focus();
    }
  }

  escapeClose() {
    this.closeDropdown();
    this.focusBack();
  }

  keyDownSelectOption(option: IDropdownOption<T> | null) {
    this.selectOption(option);
    this.focusBack();
  }

  focusBack() {
    setTimeout(() => {
      this.trigger.nativeElement.focus();
    }, 0);
  }
}
