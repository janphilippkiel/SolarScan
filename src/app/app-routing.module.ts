import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InputFormComponent } from './input-form/input-form.component';

const routes: Routes = [
  { path: 'input', component: InputFormComponent },
  // { path: 'second-component', component: SecondComponent },
  { path: '',   redirectTo: '/input', pathMatch: 'full' }, // redirect to `input`
  // { path: '**', component: PageNotFoundComponent },  // Wildcard route for a 404 page
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
