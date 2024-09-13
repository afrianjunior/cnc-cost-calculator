import React, { useState, useEffect, ChangeEvent } from 'react';
import { Helper } from 'dxf';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ImageUpload from '@/components/custom/image-upload';
import { Alert, AlertDescription } from './components/ui/alert';
import { Separator } from '@/components/ui/separator';

type Unit = 'mm' | 'cm' | 'm' | 'in' | 'ft';

interface UnitConversions {
  [key: string]: number;
}

interface CurrencyOption {
  code: string;
  name: string;
}

const PathLengthCalculator: React.FC = () => {
  const [totalLength, setTotalLength] = useState<number | null>(null);
  const [isFileUploaded, setIsFileUploaded] = useState<boolean>(false);
  const [fileType, setFileType] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit>('cm');
  const [price, setPrice] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('IDR');
  const [userLocale, setUserLocale] = useState<string>('en-US');

  const unitConversions: UnitConversions = {
    mm: 10,
    cm: 1,
    m: 0.01,
    in: 1 / 2.54,
    ft: 1 / 30.48,
  };

  const currencyOptions: CurrencyOption[] = [
    { code: 'IDR', name: 'Indonesia Rupiah' },
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'CNY', name: 'Chinese Yuan' },
    // Add more currencies as needed
  ];

  useEffect(() => {
    // Attempt to get user's locale
    const userLocale = navigator.language || 'en-US';
    setUserLocale(userLocale);

    // Attempt to get user's currency based on locale
    try {
      const formatter = new Intl.NumberFormat(userLocale, { style: 'currency', currency: 'USD' });
      const parts = formatter.formatToParts(1);
      const currencyPart = parts.find(part => part.type === 'currency');
      if (currencyPart && currencyOptions.some(option => option.code === currencyPart.value)) {
        setSelectedCurrency(currencyPart.value);
      }
    } catch (error) {
      console.error('Error detecting user currency:', error);
    }
  }, []);

  const calculateSVGPathLength = (svgContent: string): number => {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    const paths = svgDoc.querySelectorAll('path');
    let totalLength = 0;

    paths.forEach(path => {
      totalLength += path.getTotalLength();
    });

    // SVG typically uses pixels, so convert to cm first
    return totalLength * 2.54 / 96;
  };

  const calculateDXFPathLength = (dxfContent: string): number => {
    const helper = new Helper(dxfContent);
    const parsed = helper.parsed;
    let length = 0;

    parsed.entities.forEach(entity => {
      if (entity.type === 'LINE' && entity.start && entity.end) {
        const dx = entity.end.x - entity.start.x;
        const dy = entity.end.y - entity.start.y;
        length += Math.sqrt(dx * dx + dy * dy);
      } else if (entity.type === 'LWPOLYLINE' && entity.vertices) {
        for (let i = 0; i < entity.vertices.length - 1; i++) {
          const start = entity.vertices[i];
          const end = entity.vertices[i + 1];
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          length += Math.sqrt(dx * dx + dy * dy);
        }
      }
      // Add handling for other entity types (arcs, circles, etc.) here
    });

    // DXF files often use millimeters, so convert to cm
    return length / 10;
  };

  const handleFileUpload = (files: File[]) => {
    if (!files.length) return;
    const file = files[0]
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const content = e.target?.result;
      if (typeof content !== 'string') return;

      let length = 0;

      if (file.name.toLowerCase().endsWith('.dxf')) {
        length = calculateDXFPathLength(content);
        setFileType('DXF');
      } else if (file.name.toLowerCase().endsWith('.svg')) {
        length = calculateSVGPathLength(content);
        setFileType('SVG');
      } else {
        alert('Unsupported file type. Please upload a DXF or SVG file.');
        return;
      }
      setIsFileUploaded(true)
      setTotalLength(length);
    };
    reader.readAsText(file);
  };

  const convertLength = (length: number, toUnit: Unit): number => {
    return length * unitConversions[toUnit];
  };

  const calculateTotalCost = (): number | null => {
    if (totalLength === null || !price) return null;
    const convertedLength = convertLength(totalLength, selectedUnit);
    return convertedLength * parseFloat(price);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(userLocale, {
      style: 'currency',
      currency: selectedCurrency,
    }).format(amount);
  };

  return (
    <div className="pb-24 space-y-4 max-w-[450px] mx-auto">
      <h1 className="text-2xl font-bold text-center mt-8 mb-10">CNC Cutting Cost Calculator</h1>
      <Alert>
        <AlertDescription>
          This app lets you easily measure your DXF or SVG file paths in various units and get instant price estimates for CNC cutting cost. Save time and avoid mistakes with this efficient tool.
        </AlertDescription>
      </Alert>
      <div>
        <ImageUpload
          onChange={handleFileUpload}
          onRemove={() => {
            setTotalLength(null)
          }}
        />
      </div>

      {isFileUploaded && totalLength !== null ? totalLength > 0 ? (
        <>
          <div className="flex items-center">
            <Select value={selectedUnit} onValueChange={(value: Unit) => setSelectedUnit(value)}>
              <SelectTrigger id="unit-select" className="w-full">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mm">Millimeters (mm)</SelectItem>
                <SelectItem value="cm">Centimeters (cm)</SelectItem>
                <SelectItem value="m">Meters (m)</SelectItem>
                <SelectItem value="in">Inches (in)</SelectItem>
                <SelectItem value="ft">Feet (ft)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-center">
            <span className="text-green-500 pr-2">{convertLength(totalLength, selectedUnit).toFixed(2)} {selectedUnit}</span>
            of length
          </div>


          <Separator className="my-4" />

          <div>
            <Select value={selectedCurrency} onValueChange={(value: string) => setSelectedCurrency(value)}>
              <SelectTrigger id="currency-select" className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.name} ({currency.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-4">
            <Label htmlFor="price-input" className="w-[50%]">Price per {selectedUnit}:</Label>
            <Input
              id="price-input"
              type="number"
              value={price}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)}
              className="w-full"
              placeholder="21000"
            />
          </div>
        </>
      ) : (
        <Alert variant="destructive">
          <AlertDescription>
              Measurement couldn't be completed. Please note the following assumptions:
              <ul className="py-4">
                <li className="py-2">
                  For SVG files, we assume the units are in pixels and use a standard 96 PPI for conversion.
                </li>
                <li>
                  For DXF files, we assume the units are in millimeters. This is a common default, but not universal.
                </li>
              </ul>
          </AlertDescription>
        </Alert>      
      ) : null}

      {totalLength !== null && fileType && (
        <div className="space-y-2 text-center">
          {calculateTotalCost() !== null && (
            <p className="text-lg font-semibold">
              {formatCurrency(calculateTotalCost()!)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PathLengthCalculator;
