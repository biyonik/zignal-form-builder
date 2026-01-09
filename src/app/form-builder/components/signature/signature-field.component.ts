import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signature-field',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="signature-container">
      <canvas
        #signatureCanvas
        [width]="width"
        [height]="height"
        [style.width.px]="width"
        [style.height.px]="height"
        [style.backgroundColor]="backgroundColor"
        [class.disabled]="disabled"
        (mousedown)="startDrawing($event)"
        (mousemove)="draw($event)"
        (mouseup)="stopDrawing()"
        (mouseleave)="stopDrawing()"
        (touchstart)="startDrawingTouch($event)"
        (touchmove)="drawTouch($event)"
        (touchend)="stopDrawing()"
      ></canvas>
      <div class="signature-actions">
        <button
          type="button"
          class="btn-clear"
          (click)="clear()"
          [disabled]="disabled || isEmpty()"
        >
          {{ lang === 'tr' ? 'Temizle' : 'Clear' }}
        </button>
      </div>
      @if (isEmpty() && showPlaceholder) {
        <div class="signature-placeholder">
          {{ lang === 'tr' ? 'İmzanızı buraya çizin' : 'Draw your signature here' }}
        </div>
      }
    </div>
  `,
  styles: [`
    .signature-container {
      position: relative;
      display: inline-block;
    }

    canvas {
      border: 2px dashed var(--border, #ddd);
      border-radius: 8px;
      cursor: crosshair;
      touch-action: none;
    }

    canvas.disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .signature-actions {
      margin-top: 8px;
      display: flex;
      gap: 8px;
    }

    .btn-clear {
      padding: 6px 12px;
      background: var(--bg-tertiary, #f0f0f0);
      border: 1px solid var(--border, #ddd);
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;
    }

    .btn-clear:hover:not(:disabled) {
      background: var(--error, #e74c3c);
      color: #fff;
      border-color: var(--error, #e74c3c);
    }

    .btn-clear:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .signature-placeholder {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: var(--text-secondary, #888);
      font-size: 0.9rem;
      pointer-events: none;
      user-select: none;
    }
  `]
})
export class SignatureFieldComponent implements AfterViewInit, OnDestroy {
  @ViewChild('signatureCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() width = 400;
  @Input() height = 150;
  @Input() penColor = '#000000';
  @Input() backgroundColor = '#ffffff';
  @Input() disabled = false;
  @Input() value?: string;
  @Input() lang: 'tr' | 'en' = 'tr';
  @Input() showPlaceholder = true;

  @Output() valueChange = new EventEmitter<string>();
  @Output() signatureComplete = new EventEmitter<string>();

  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;
  private hasDrawn = signal(false);

  ngAfterViewInit(): void {
    this.initCanvas();
    if (this.value) {
      this.loadSignature(this.value);
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private initCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    if (this.ctx) {
      this.ctx.strokeStyle = this.penColor;
      this.ctx.lineWidth = 2;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.clearCanvas();
    }
  }

  private clearCanvas(): void {
    if (this.ctx) {
      this.ctx.fillStyle = this.backgroundColor;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  private loadSignature(dataUrl: string): void {
    const img = new Image();
    img.onload = () => {
      if (this.ctx) {
        this.clearCanvas();
        this.ctx.drawImage(img, 0, 0);
        this.hasDrawn.set(true);
      }
    };
    img.src = dataUrl;
  }

  startDrawing(event: MouseEvent): void {
    if (this.disabled) return;
    this.isDrawing = true;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.lastX = event.clientX - rect.left;
    this.lastY = event.clientY - rect.top;
  }

  startDrawingTouch(event: TouchEvent): void {
    if (this.disabled) return;
    event.preventDefault();
    this.isDrawing = true;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const touch = event.touches[0];
    this.lastX = touch.clientX - rect.left;
    this.lastY = touch.clientY - rect.top;
  }

  draw(event: MouseEvent): void {
    if (!this.isDrawing || !this.ctx || this.disabled) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();

    this.lastX = x;
    this.lastY = y;
    this.hasDrawn.set(true);
  }

  drawTouch(event: TouchEvent): void {
    if (!this.isDrawing || !this.ctx || this.disabled) return;
    event.preventDefault();

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const touch = event.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();

    this.lastX = x;
    this.lastY = y;
    this.hasDrawn.set(true);
  }

  stopDrawing(): void {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.emitValue();
    }
  }

  clear(): void {
    this.clearCanvas();
    this.hasDrawn.set(false);
    this.valueChange.emit('');
  }

  isEmpty(): boolean {
    return !this.hasDrawn();
  }

  private emitValue(): void {
    const dataUrl = this.canvasRef.nativeElement.toDataURL('image/png');
    this.valueChange.emit(dataUrl);
    this.signatureComplete.emit(dataUrl);
  }

  getSignatureData(): string {
    return this.canvasRef.nativeElement.toDataURL('image/png');
  }
}
