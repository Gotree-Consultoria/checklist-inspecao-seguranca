import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cnpjFormat',
  standalone: true
})
export class CnpjFormatPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    
    const digits = (value || '').replace(/\D+/g, '').slice(0, 14);
    if (!digits) return '';
    
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + '.' + digits.slice(2);
    if (digits.length > 5) formatted = formatted.slice(0, 6) + '.' + formatted.slice(6);
    if (digits.length > 8) formatted = formatted.slice(0, 10) + '/' + formatted.slice(10);
    if (digits.length > 12) formatted = formatted.slice(0, 15) + '-' + formatted.slice(15);
    
    return formatted;
  }
}
