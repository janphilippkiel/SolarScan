import { environment } from './../../environments/environment';

import { Component } from '@angular/core';
import { Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SafeResourceUrl } from '@angular/platform-browser';

import {
  FormControl,
  FormGroupDirective,
  NgForm
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';


/** Error when invalid control is dirty, touched, or submitted. */
export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }
}

/**
 * @title Input form
 */
@Component({
  selector: 'app-input-form',
  templateUrl: './input-form.component.html',
  styleUrl: './input-form.component.scss',
  providers: [
    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: { displayDefaultIndicatorType: false },
    },
  ],
  standalone: false
})
export class InputFormComponent {
  solarPanels = new FormControl({ value: true, disabled: false }, [Validators.requiredTrue]);
  energyStorage = new FormControl({ value: false, disabled: true }, [Validators.required]);
  monthlyBill = new FormControl('', [Validators.required, Validators.min(20), Validators.max(2000)]);
  addressQuery = new FormControl('', [Validators.required]);
  queryCoordinates: any;
  googleMapsPreviewUrl: SafeResourceUrl = "https://localhost";
  buildingInsights: any;
  solarPanelConfigs: any;
  imageryDate: any;
  solarPanelSlider = new FormControl(0);

  constructor(
    private _httpClient: HttpClient
  ) { }

  findCoordinates() {
    this._httpClient.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${this.addressQuery.value}&key=${environment.googleApiKey}`).subscribe((data: any) => {
      this.queryCoordinates = data['results'][0]['geometry']['location'];
      this.googleMapsPreviewUrl = `https://www.google.com/maps/embed/v1/place?key=${environment.googleApiKey}&q=${this.queryCoordinates['lat']},${this.queryCoordinates['lng']}&center=${this.queryCoordinates['lat']},${this.queryCoordinates['lng']}&zoom=17&maptype=satellite`;
    });
  }

  getBuildingInsights() {
    this._httpClient.get(`https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${this.queryCoordinates['lat']}&location.longitude=${this.queryCoordinates['lng']}&key=${environment.googleApiKey}&requiredQuality=HIGH`).subscribe((data: any) => {
      this.buildingInsights = data;
      this.solarPanelConfigs = this.buildingInsights.solarPotential.solarPanelConfigs;
      this.imageryDate = Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(`${this.buildingInsights.imageryDate.year}-${this.buildingInsights.imageryDate.month}-${this.buildingInsights.imageryDate.day}`));
      this.calculateSolarSavings(0);
    });
  }

  yearlyEnergyDcKwh: number = 5381.9507;
  panelsCount: number = 23;
  panelCapacityWatts: number = 250;
  costPerKwh: number = 0.4627;
  // monthlyBill: number = 500;

  costIncreaseFactor: number = 1.05;
  dcToAcDerate: number = 0.85;
  discountRate: number = 1.04;
  efficiencyDepreciationFactor: number = 0.995;
  incentives: number = 1000;
  installationLifeSpan: number = 20;

  remainingLifetimeUtilityBill: number = 0;
  installationCost: number = 0;
  totalCostWithSolar: number = 0;
  costOfElectricityWithoutSolar: number = 0;
  savings: number = 0;

  calculateSolarSavings(solarPanelConfig: number): void {
    this.yearlyEnergyDcKwh = this.solarPanelConfigs[solarPanelConfig].yearlyEnergyDcKwh;
    this.panelsCount = this.solarPanelConfigs[solarPanelConfig].panelsCount;
    this.panelCapacityWatts = this.buildingInsights?.solarPotential.panelCapacityWatts;
    this.installationLifeSpan = this.buildingInsights?.solarPotential.panelLifetimeYears;

    const monthlyEnergyConsumption = this.kWhConsumptionModel(Number(this.monthlyBill.value));
    const annualKWhEnergyConsumption = monthlyEnergyConsumption * 12;
    const initialAcKwhPerYear = this.yearlyEnergyDcKwh * this.dcToAcDerate;

    this.remainingLifetimeUtilityBill = this.calculateRemainingLifetimeUtilityBill(
      annualKWhEnergyConsumption,
      initialAcKwhPerYear
    );

    this.installationCost = this.installationCostModel(this.calculateInstallationSize());
    this.totalCostWithSolar = this.installationCost + this.remainingLifetimeUtilityBill - this.incentives;
    this.savings = this.calculateSavings();
  }

  calculateInstallationSize(): number {
    return this.panelsCount * (this.panelCapacityWatts * 1.6) / 1000;
  }

  kWhConsumptionModel(monthlyBill: number): number {
    return monthlyBill / this.costPerKwh;
  }

  calculateRemainingLifetimeUtilityBill(
    annualKWhEnergyConsumption: number,
    initialAcKwhPerYear: number
  ): number {
    const bill = Array(this.installationLifeSpan).fill(0);

    for (let year = 0; year < this.installationLifeSpan; year++) {
      bill[year] = this.calculateAnnualUtilityBillEstimate(
        annualKWhEnergyConsumption,
        initialAcKwhPerYear,
        year
      );
    }

    return bill.reduce((sum, currentValue) => sum + currentValue, 0);
  }

  calculateAnnualUtilityBillEstimate(
    annualKWhEnergyConsumption: number,
    initialAcKwhPerYear: number,
    year: number
  ): number {
    return (
      this.billCostModel(
        annualKWhEnergyConsumption -
          this.annualProduction(initialAcKwhPerYear, year)
      ) *
      Math.pow(this.costIncreaseFactor, year) /
      Math.pow(this.discountRate, year)
    );
  }

  billCostModel(kWh: number): number {
    return kWh * this.costPerKwh;
  }

  annualProduction(initialAcKwhPerYear: number, year: number): number {
    return initialAcKwhPerYear * Math.pow(this.efficiencyDepreciationFactor, year);
  }

  installationCostModel(installationSize: number): number {
    return installationSize * 1400;
  }

  calculateSavings(): number {
    const lifetimeBill =
      Number(this.monthlyBill.value) * 12 *
      (1 - Math.pow(this.costIncreaseFactor / this.discountRate, this.installationLifeSpan)) /
      (1 - this.costIncreaseFactor / this.discountRate);

    this.costOfElectricityWithoutSolar = lifetimeBill;
    return this.costOfElectricityWithoutSolar - this.totalCostWithSolar;
  }

  flushBuildingInsights() {
    this.buildingInsights = null;
    this.solarPanelConfigs = null;
  }

}