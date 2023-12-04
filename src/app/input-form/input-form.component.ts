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
  electricityBill = new FormControl('', [Validators.required, Validators.min(20), Validators.max(2000)]);
  addressQuery = new FormControl('', [Validators.required]);
  queryCoordinates: any;
  googleMapsPreviewUrl: SafeResourceUrl = "https://localhost";
  buildingInsights: any;
  solarPanelConfigs: any;
  imageryDate: any;
  solarPanelCount = new FormControl('');

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
      console.log(data);
      // this.solarPanelConfigs.forEach((element: any) => {
      //   console.log(element)
      // });
    });
  }

  flushBuildingInsights() {
    this.buildingInsights = null;
    this.solarPanelConfigs = null;
  }

}