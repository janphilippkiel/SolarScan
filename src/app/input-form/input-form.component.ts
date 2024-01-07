/// <reference types="@types/google.maps" />
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
import { Loader } from '@googlemaps/js-api-loader';

/**
 * Custom error state matcher for form controls.
 * @implements {ErrorStateMatcher}
 */
export class MyErrorStateMatcher implements ErrorStateMatcher {
  /**
   * Checks if the control is in an error state.
   * @param {FormControl | null} control - The form control.
   * @param {FormGroupDirective | NgForm | null} form - The form group or form.
   * @returns {boolean} - Whether the control is in an error state.
   */
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }
}

/**
 * InputFormComponent represents an Angular component for solar panels and energy calculations.
 * @class
 * @implements {OnInit}
 */
@Component({
  selector: 'app-input-form',
  templateUrl: './input-form.component.html',
  styleUrl: './input-form.component.scss',
  providers: [
    {
      // Disable the default stepper indicator
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: { displayDefaultIndicatorType: false },
    },
  ],
  standalone: false
})
export class InputFormComponent {
  /**
   * Form control for solar panels.
   * @type {FormControl}
   */
  solarPanels: FormControl = new FormControl({ value: true, disabled: false }, [Validators.requiredTrue]);

  /**
   * Form control for energy storage.
   * @type {FormControl}
   */
  energyStorage: FormControl = new FormControl({ value: false, disabled: true }, [Validators.required]);

  /**
   * Form control for monthly bill.
   * @type {FormControl}
   */
  monthlyBill: FormControl = new FormControl('', [Validators.required, Validators.min(20), Validators.max(2000)]);

  /**
   * Form control for cost per kWh.
   * @type {FormControl}
   */
  costPerKwh: FormControl = new FormControl(0.4627, [Validators.required, Validators.min(0.1), Validators.max(1)]);

  /**
   * Form control for address query.
   * @type {FormControl}
   */
  addressQuery: FormControl = new FormControl('', [Validators.required]);

  /**
   * Coordinates of the query.
   * @type {{ lat: number; lng: number }}
   */
  queryCoordinates: { lat: number; lng: number } = {
    lat: 50.928411970811844,
    lng: 6.929333977827163
  };

  /**
   * Safe URL for Google Maps preview.
   * @type {SafeResourceUrl}
   */
  googleMapsPreviewUrl: SafeResourceUrl = "https://localhost";

  /**
   * Building insights data.
   * @type {any}
   */
  buildingInsights: any;

  /**
   * Solar panel configurations.
   * @type {any}
   */
  solarPanelConfigs: any;

  /**
   * Imagery date.
   * @type {any}
   */
  imageryDate: any;

  /**
   * Form control for solar panel slider.
   * @type {FormControl}
   */
  solarPanelSlider: FormControl = new FormControl(0);

  /**
   * Google Maps instance.
   * @private
   * @type {google.maps.Map}
   */
  private map!: google.maps.Map;

  /**
   * Array of map markers.
   * @private
   * @type {google.maps.Marker[]}
   */
  private markers: google.maps.Marker[] = [];

  /**
   * Creates an instance of InputFormComponent.
   * @constructor
   * @param {HttpClient} _httpClient - The HTTP client for making requests.
   */
  constructor(
    private _httpClient: HttpClient
  ) { }

  /**
   * Lifecycle hook called after the component's view has been initialized.
   * Initializes the Google Maps API and searches for the address.
   * @method
   * @returns {void}
   */
  ngAfterViewInit(): void {
    this.initMap();
    this.searchAddress();
  }

  /**
   * Initializes the Google Maps API and sets up the map with specified configurations.
   * This method is responsible for loading the necessary libraries, creating a map instance,
   * and configuring its initial settings such as center, map type, and styling.
   *
   * @private
   * @method
   * @returns {Promise<void>}
   */
  private async initMap(): Promise<void> {
    // Create a loader instance with the provided Google API key
    const loader = new Loader({
      apiKey: environment.googleApiKey,
      version: "weekly"
    });

    // Load the required libraries using the loader
    loader.load().then(async () => {
      // Import the 'Map' library from the loaded Google Maps API
      const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;

      // Import the 'geometry' library
      await google.maps.importLibrary("geometry") as google.maps.GeometryLibrary;

      // Create a new map instance with specified configurations
      this.map = new Map(document.getElementById("map") as HTMLElement, {
        center: {
          lat: this.queryCoordinates.lat,
          lng: this.queryCoordinates.lng
        },
        mapTypeId: "satellite",
        tilt: 0,
        styles: [
          {
            featureType: "all",
            elementType: "labels",
            stylers: [
              { visibility: "off" }
            ]
          }
        ],
        zoom: 17,
        streetViewControl: false,
        mapTypeControl: false,
        rotateControl: false
      });
    });
  }

  /**
   * Perform a location search using the Google Maps Autocomplete service.
   * Updates the map and sets markers based on the selected place.
   * @private
   * @async
   * @function
   * @returns {Promise<void>} - A Promise that resolves once the address search is completed.
   */
  private async searchAddress(): Promise<void> {
    // Import the Autocomplete module from Google Maps library
    const { Autocomplete } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;

    // Create an Autocomplete instance on the address input element
    const autocomplete = new Autocomplete(document.getElementById("address") as HTMLInputElement, {
      componentRestrictions: { country: "de" },
      fields: ["geometry"],
      types: ["address"]
    });

    // Listen for changes in the selected place
    autocomplete.addListener("place_changed", () => {
      // Get the selected place
      const place = autocomplete.getPlace();
      const map = this.map;

      // Check if the selected place has a valid geometry location
      if (!place.geometry?.location) {
        // If not, set an error in the address query form control
        this.addressQuery.setErrors({ 'incorrect': true });
        return;
      }

      // Clear any previous errors
      this.addressQuery.setErrors(null);

      // Update the query coordinates with the selected place's location
      this.queryCoordinates.lat = place.geometry.location.lat();
      this.queryCoordinates.lng = place.geometry.location.lng();

      let icon: google.maps.Icon | string | undefined;

      // Check the type of the place icon
      if (typeof place.icon === 'string') {
        // If it's a string, create an icon object
        icon = {
          url: place.icon as string,
          size: new google.maps.Size(71, 71),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(17, 34),
          scaledSize: new google.maps.Size(25, 25),
        };
      } else {
        // Otherwise, use the provided icon
        icon = place.icon;
      }

      // Clear existing markers
      this.markers = [];

      // Create a new marker with the selected place's details
      this.markers.push(new google.maps.Marker({
        map,
        icon,
        title: place.name,
        position: place.geometry.location
      }));

      // Move the map to the selected place's location and set zoom level
      map.moveCamera({
        center: {
          lat: this.queryCoordinates.lat,
          lng: this.queryCoordinates.lng
        },
        zoom: 21
      });
    });
  }

  /**
   * Retrieves building insights data from the Google Solar API based on the current coordinates.
   * Performs an HTTP GET request to the Google Solar API to find building insights for the specified location.
   * Updates relevant properties based on the received data, such as solar panel configurations,
   * imagery date, and calculates solar savings and estimated yearly energy demand.
   *
   * @method
   * @returns {void}
   */
  getBuildingInsights(): void {
    // Make an HTTP GET request to the Google Solar API
    this._httpClient
      .get(`https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${this.queryCoordinates.lat}&location.longitude=${this.queryCoordinates.lng}&key=${environment.googleApiKey}&requiredQuality=HIGH`)
      .subscribe((data: any) => {
        // Update building insights data
        this.buildingInsights = data;

        // Extract solar panel configurations from building insights
        this.solarPanelConfigs = this.buildingInsights.solarPotential.solarPanelConfigs;

        // Format and update imagery date
        this.imageryDate = Intl.DateTimeFormat('en-GB', {
          month: 'long',
          year: 'numeric'
        }).format(new Date(`${this.buildingInsights.imageryDate.year}-${this.buildingInsights.imageryDate.month}-${this.buildingInsights.imageryDate.day}`));

        // Calculate solar savings and estimated yearly energy demand
        this.calculateSolarSavings();
        this.estimatedYearlyEnergyDemand = this.kWhConsumptionModel(Number(this.monthlyBill.value)) * 12;

        // Select the most suitable solar panel configuration
        this.selectMostSuitableConfig();
      });
  }


  /**
   * Default yearly energy demand for solar panel calculations.
   * @type {number}
   */
  yearlyEnergyDcKwh: number = 5381.9507;

  /**
   * Default number of solar panels for calculations.
   * @type {number}
   */
  panelsCount: number = 23;

  /**
   * Default solar panel capacity in watts for calculations.
   * @type {number}
   */
  panelCapacityWatts: number = 250;

  /**
   * Estimated yearly energy demand based on monthly bill.
   * @type {number}
   */
  estimatedYearlyEnergyDemand: number = 0;

  /**
   * Cost increase factor for calculations.
   * @type {number}
   */
  costIncreaseFactor: number = 1.05;

  /**
   * DC to AC derate factor for solar panel calculations.
   * @type {number}
   */
  dcToAcDerate: number = 0.85;

  /**
   * Discount rate for calculations.
   * @type {number}
   */
  discountRate: number = 1.04;

  /**
   * Efficiency depreciation factor for calculations.
   * @type {number}
   */
  efficiencyDepreciationFactor: number = 0.995;

  /**
   * Incentives for solar installations.
   * @type {number}
   */
  incentives: number = 1000;

  /**
   * Lifespan of the solar panel installation in years.
   * @type {number}
   */
  installationLifeSpan: number = 20;

  /**
   * Calculates solar savings based on solar panel configurations and energy consumption.
   * @private
   * @method
   * @returns {void}
   */
  private calculateSolarSavings(): void {
    // Iterate through each solar panel configuration
    this.solarPanelConfigs.forEach((solarPanelConfig: any, index: number) => {

      // Set properties from the current solar panel configuration
      this.yearlyEnergyDcKwh = solarPanelConfig.yearlyEnergyDcKwh;
      this.panelsCount = solarPanelConfig.panelsCount;
      this.panelCapacityWatts = this.buildingInsights?.solarPotential.panelCapacityWatts;
      this.installationLifeSpan = this.buildingInsights?.solarPotential.panelLifetimeYears;

      // Calculate monthly and annual energy consumption
      const monthlyEnergyConsumption = this.kWhConsumptionModel(Number(this.monthlyBill.value));
      const annualKWhEnergyConsumption = monthlyEnergyConsumption * 12;

      // Calculate initial AC kWh production per year
      const initialAcKwhPerYear = this.yearlyEnergyDcKwh * this.dcToAcDerate;

      // Calculate the remaining lifetime utility bill
      const remainingLifetimeUtilityBill = this.calculateRemainingLifetimeUtilityBill(
        annualKWhEnergyConsumption,
        initialAcKwhPerYear
      );

      // Calculate installation cost and update solar panel configuration properties
      solarPanelConfig.installationCost = this.installationCostModel(this.calculateInstallationSize());
      solarPanelConfig.totalCostWithSolar = solarPanelConfig.installationCost + remainingLifetimeUtilityBill - this.incentives;
      solarPanelConfig.lifetimeBill = this.calculateLifetimeBill();
      solarPanelConfig.savings = solarPanelConfig.lifetimeBill - solarPanelConfig.totalCostWithSolar;
    });
  }

  /**
   * Calculates the installation size based on the number of panels and capacity.
   * @private
   * @method
   * @returns {number} - The installation size.
   */
  private calculateInstallationSize(): number {
    return this.panelsCount * (this.panelCapacityWatts * 1.6) / 1000;
  }

  /**
   * Calculates kWh consumption based on the monthly bill and cost per kWh.
   * @param {number} monthlyBill - The monthly electricity bill.
   * @returns {number} - The estimated kWh consumption.
   */
  kWhConsumptionModel(monthlyBill: number): number {
    return monthlyBill / Number(this.costPerKwh.value);
  }

  /**
   * Calculates the remaining lifetime utility bill.
   * @private
   * @method
   * @param {number} annualKWhEnergyConsumption - Annual kWh energy consumption.
   * @param {number} initialAcKwhPerYear - Initial AC kWh per year.
   * @returns {number} - The remaining lifetime utility bill.
   */
  private calculateRemainingLifetimeUtilityBill(
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

  /**
   * Calculates the annual utility bill estimate for a given year.
   * @private
   * @method
   * @param {number} annualKWhEnergyConsumption - Annual kWh energy consumption.
   * @param {number} initialAcKwhPerYear - Initial AC kWh per year.
   * @param {number} year - The year for which the estimate is calculated.
   * @returns {number} - The annual utility bill estimate.
   */
  private calculateAnnualUtilityBillEstimate(
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

  /**
   * Calculates the cost of the bill based on kWh.
   * @private
   * @method
   * @param {number} kWh - The kWh value.
   * @returns {number} - The cost of the bill.
   */
  private billCostModel(kWh: number): number {
    return kWh * Number(this.costPerKwh.value);
  }

  /**
   * Calculate the annual energy production based on initial AC kWh and year.
   * @param {number} initialAcKwhPerYear - Initial AC kWh per year.
   * @param {number} year - Year.
   * @returns {number} - Annual energy production.
   */
  annualProduction(initialAcKwhPerYear: number, year: number): number {
    return initialAcKwhPerYear * Math.pow(this.efficiencyDepreciationFactor, year);
  }

  /**
   * Calculate the installation cost based on the installation size.
   * @param {number} installationSize - Size of the installation.
   * @returns {number} - Installation cost.
   */
  installationCostModel(installationSize: number): number {
    return installationSize * 1400;
  }

  /**
   * Calculate the lifetime bill considering cost factors and discount rate.
   * @returns {number} - Lifetime bill.
   */
  calculateLifetimeBill(): number {
    return Number(this.monthlyBill.value) * 12 *
      (1 - Math.pow(this.costIncreaseFactor / this.discountRate, this.installationLifeSpan)) /
      (1 - this.costIncreaseFactor / this.discountRate);
  }

  /**
   * Selects the most suitable solar panel configuration based on the closest yearly energy demand.
   * It iterates through available solar panel configurations and determines the one with
   * the minimum difference from the estimated yearly energy demand.
   *
   * @method
   * @returns {void}
   */
  selectMostSuitableConfig(): void {
    // Find the solar panel config with the closest yearly energy demand
    let closestConfigIndex = 0;
    let minDifference = Math.abs(this.solarPanelConfigs[0].yearlyEnergyDcKwh - this.estimatedYearlyEnergyDemand);

    // Iterate through each solar panel configuration to find the closest match
    for (let i = 1; i < this.solarPanelConfigs.length; i++) {
      const difference = Math.abs(this.solarPanelConfigs[i].yearlyEnergyDcKwh - this.estimatedYearlyEnergyDemand);

      // Update the index and minimum difference if a closer match is found
      if (difference < minDifference) {
        closestConfigIndex = i;
        minDifference = difference;
      }
    }

    // Set the selected solar panel config
    this.solarPanelSlider.setValue(closestConfigIndex);
  }


  /**
   * Flush building insights data.
   */
  flushBuildingInsights(): void {
    this.buildingInsights = null;
    this.solarPanelConfigs = null;
  }

}