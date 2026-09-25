# How calculations work

This is a screening estimate from simulated production, constant prices, and the costs you enter. It does not model tax, financing, inflation, escalation, or costs you have not entered.

## Monthly sales volumes

The calculation uses monthly-resampled cumulative ECLIPSE vectors. Oil comes from FOPT. For gas, it uses reported sales gas from FGST when available. Otherwise, it calculates sales gas from produced gas FGPT, less injected gas FGIT and consumed gas FGCT.

For each realization, we subtract consecutive monthly cumulative values to estimate the volume produced in each calendar month.

```
monthly volume = cumulative at next month start - cumulative at month start
gas deductions = injected gas + consumed gas
derived sales gas = produced gas - gas deductions
```

A missing gas component is only treated as zero after you accept that assumption. Missing, failed, or non-finite data is never treated as zero production.

## Source coverage

Monthly values are resampled from the simulator's own report dates, so the module also reads how each month is supported by those dates:

- **Source-aligned:** both month boundaries are source report dates.
- **Interpolated:** the month lies inside the source dates, but at least one boundary is interpolated linearly, for example from annual reports.
- **Partial:** only part of the month is covered, for example when the simulation ends on 15 June.
- **Unsupported:** the month lies outside the source dates; its value is held padding.

Source-aligned and interpolated months are used. A partial, unsupported, or unverified month anywhere in the evaluation makes that product's full-evaluation totals and the financial results that need it unavailable for the realization. The months are not trimmed, prorated, or treated as zero. For a delta ensemble, a month is supported only when both the comparison and the reference cover it. When the server provides no coverage information, nothing is published.

The evaluation runs from 1 January of the prediction start year through the last supported month of the full ensemble. A source ending on 1 January closes the previous December; it does not add production in the new year. Each realization and product must be covered for every month of this common evaluation. A realization that ends earlier is not extended with zeros. Months before a realization's first source date are not assumed to be zero, even when the first cumulative value is zero, so a prediction start before the source data makes financial results unavailable. Source coverage describes the source dates only; it is not proof of a successful simulation or of the intended forecast period.

## Realizations and ensemble results

The module calculates each realization separately. It does not first average production profiles and then calculate one economic result. A realization with incomplete oil or sales-gas coverage is excluded only from measures that need that product; an available volume measure can still be shown.

Charts, percentiles, and output channels use one finite calculated value from each eligible realization. The table count shows how many realizations are valid for the selected measure out of the selected realizations. Missing, unavailable, and undefined values are excluded, not set to zero.

Filtering changes the realizations shown in the chart and statistics. It does not move the prediction start, the valuation date, the simulation end, or the generated cost years, which are found from the full selected ensemble.

## Discounting and prediction start

Volumes and money received later contribute less at a positive discount rate. An 8% rate is written as 0.08 in the calculation.

```
discount factor = (1 + rate)^(-t)
t for a month = year - start year + (month - 0.5) / 12
t for annual CAPEX = year - start year + 0.5
```

Results are valued at **1 January of the prediction start year**, which you enter. Production volumes and their revenue are discounted at the midpoint of each month. Each year's OPEX is paid as twelve equal monthly amounts, one twelfth at each month midpoint, using the same factors as that year's production. Annual CAPEX is discounted at mid-year. These are screening conventions chosen for this module. R-90150 specifies that total expected cost estimates are expressed in mid-year cost; that is related cost-basis context, not a requirement for all of these timing choices, and this module does not claim R-90150 compliance.

The full annual OPEX you enter applies to every included year, even when the evaluation ends before December in the final year. In that case the remaining monthly OPEX amounts are still paid after the last revenue month; they do not extend production coverage.

Annual profile values are sums of monthly discounted values. Annual totals are not discounted again at mid-year.

Discounted volumes are **timing-weighted screening indicators, not reserves or recoverable volumes**. Discounting changes their weighting for comparison, not the simulated physical production.

## NPV

Net present value (NPV) is discounted revenue minus discounted costs over the evaluation.

```
monthly revenue = oil volume * oil price + sales gas volume * gas price
revenue PV = sum(monthly revenue * monthly factor)
OPEX PV = sum(annual OPEX / 12 * monthly factor)
CAPEX PV = sum(CAPEX * mid-year factor)
cost PV = CAPEX PV + OPEX PV
NPV = revenue PV - cost PV
```

Prices and costs use the selected currency, NOK or USD. Changing the currency does not convert entered values. A blank price is unspecified, so NPV is unavailable unless that product is confirmed zero in every month of the evaluation. A price of 0 intentionally omits that product's revenue; it does not turn missing volume data into zero volume.

Cost years are generated from the prediction start year through the simulation end. Blank cost cells are zero, so an operating cost does not repeat through the remaining years. Costs stored for years outside these rows are kept and listed, but not used. Zero entered costs means the NPV is discounted revenue, not a complete project-profitability estimate.

## Break-even oil price

Break-even oil price is the constant oil price that makes NPV zero while keeping the gas price fixed.

```
net cost = discounted costs - gas price * discounted gas
break-even oil price = net cost / discounted oil volume
```

The module reports break-even oil price when:

- Oil coverage is established for the whole evaluation.
- Gas revenue is determined by a price, a price of 0, or gas confirmed zero in every month.
- At least one non-zero CAPEX or OPEX entry falls inside the evaluation.
- Discounted oil volume is sufficiently different from zero to support division.

You do not need to enter an oil price to calculate it. Break-even oil price can be negative when discounted gas revenue exceeds discounted costs.

## Internal rate of return

Internal rate of return (IRR) is the annual discount rate at which `NPV(IRR) = 0`. It is calculated from the same undiscounted events as NPV, monthly revenue less monthly OPEX and mid-year CAPEX, not from your selected discount rate.

The solver supports conventional cash flows: initial net outflows followed by net inflows, with only one change of sign. Only events at exactly the same time are combined before the signs are counted; annual totals are not used, because they can hide a change of sign within a year. A profile can still be non-conventional, for example with CAPEX during production, months where OPEX exceeds revenue, or OPEX after production ends. A non-conventional profile may have multiple roots, or none; the module does not select an IRR for such a profile. A profile with no change of sign has no finite IRR. A result is also unavailable if the root is outside the solver's supported range.

## Oil equivalents

Discounted oil equivalents add discounted oil to discounted gas divided by 1000 Sm3 gas per Sm3 oil equivalent, after unit conversion. This fixed factor follows [SODIR's conversion table](https://www.sodir.no/en/about-us/use-of-content/conversion-table/). It is a volume-equivalent convention, not a price relationship; it does not determine gas revenue or break-even oil price.

## Delta ensembles

Delta vectors represent **comparison minus reference** for matching realizations. Enter incremental costs using the same convention: positive costs are additional expenditure and negative costs are savings relative to the reference.

The module calculates economics from these signed incremental profiles. A product is confirmed zero only if every monthly delta is zero; positive and negative months that cancel still need a price. For each matching realization, incremental NPV equals comparison NPV minus reference NPV when valuation date, timing, prices, discount rate, evaluation, and source coverage are the same and costs are comparison minus reference. This identity does not generally hold for differences between distribution percentiles.

Incremental IRR and break-even oil price are calculated from the incremental cash flows and volumes; they are **not differences between the two projects' IRRs or break-even prices**. Negative discounted incremental oil volume reverses oil-price sensitivity: a higher oil price reduces incremental NPV.

## Early value

Early value answers a different question from the full-evaluation result: **how much discounted volume or cash flow has accumulated by a chosen year?**

For example, suppose the prediction start year is 2030 and the evaluation covers 2030 through 2050, with a valuation date of 1 January 2030:

- **Full evaluation:** "What is the discounted value of the whole forecast, through 2050?"
- **Early value through 2035:** "How much discounted value has accumulated from 2030 through the end of 2035?"

Both use the same production data, prices, costs, discount rate, and valuation date. The early result includes only volumes and applicable cash flows through the end of 2035; it does not move the valuation date to 2035. Early discounted cash flow includes the entered costs in that period, so it can be negative while investment is being recovered. Discounted volume outputs do not require prices or costs.

Early outputs are checked on their own period. Complete coverage through 2035 is enough for them, even if a later month is incomplete and the full-evaluation results are unavailable.

This is useful when two development options produce similar total volumes but one delivers production sooner. Early outputs can also feed a connected analysis module, for example a tornado plot for a regular designed-sensitivity ensemble, to show which uncertainties affect early value.

**Early value adds separate outputs; it does not shorten the main evaluation.** The full-evaluation results and channels still cover 2030 through 2050 in this example.

### Setting it up

Early value is off by default. In the Results settings, check **Early value** and enter **Calculate through year**, an inclusive calendar year within the evaluation. The view then shows early discounted cash flow beside the full NPV, and the cumulative discounted cash flow profile marks the chosen year. The value is the accumulated discounted cash flow from 1 January of the prediction start year through the end of that year. It is not the remaining future value, and it is not a new valuation date.

With one realization selected, the comparison shows that realization's early value and full NPV, or states that a side is unavailable. With Aggregate, it shows the P50 of each horizon and how many realizations are valid for it. The two horizons can have different valid realizations, so the two P50 values need not come from one realization.

### Example: January 2018 to July 2020

Suppose the source data runs from 1 January 2018 to 1 July 2020, the prediction start year is 2018, and 2018 is an investment year with no production:

- **Through 2018:** only 2018's discounted flows, here mostly the discounted CAPEX, so the early value is negative.
- **Through 2019:** the discounted flows of 2018 and 2019.
- **Through 2020:** equals the full NPV for a realization that is eligible for the whole evaluation.

The 1 July 2020 source date closes June 2020, so the last production month is June. July is not counted as partly produced, and no July production is assumed. The full annual costs entered for 2020 are still included, paid as twelve monthly OPEX amounts and mid-year CAPEX; they are not prorated to six months.

### Checking a value by hand

1. Select one realization that is eligible for the whole evaluation.
2. Show the cumulative discounted cash flow time profile.
3. Set Calculate through year to 2019. The realization's plotted 2019 point equals its early discounted cash flow in the comparison. Optionally, connect a DistributionPlot to the Early discounted cash flow channel and compare that realization's value.
4. Set Calculate through year to 2020. The early value now equals that realization's full NPV.

## Reading distributions and units

Each valid realization contributes one calculated value. P90 is the lower 10th percentile and P10 the upper 90th percentile. An exceedance curve shows the fraction of valid realizations strictly above a value; it is not automatically a probability of commercial success.

Display scaling such as million or billion improves readability only and is not applied to channel values. Volume channels use simulator volume units, NPV channels use the selected currency, IRR channels use percent, and break-even channels use the selected oil-price basis. Calculations retain full precision.

## Worked example

This illustrative example covers 2020 and 2021, with source-aligned monthly coverage for both years:

- Monthly production: 10 Sm3 oil and 100 Sm3 sales gas in every month.
- Prices: 2 USD/Sm3 oil and 0.1 USD/Sm3 gas, so monthly revenue is 30 USD.
- Discount rate: 10%, with prediction start year 2020, valued at 1 January 2020.
- Costs: CAPEX of 100 USD in 2020, discounted at mid-2020, and OPEX of 60 USD in each of 2020 and 2021, paid as 5 USD per month.

### Monthly and annual values

- **January 2020:** `t = 0.5 / 12`, so the factor is `1.1^(-0.5 / 12)`, or 0.99604. The month's net cash flow is `30 - 5 = 25` USD, with PV `25 * 0.99604`.
- **December 2020:** `t = 11.5 / 12`, so the factor is 0.91271.
- **2020:** the twelve monthly factors sum to 11.44585, so revenue PV is 343.38 USD and OPEX PV is `5 * 11.44585`, or 57.23 USD. CAPEX of 100 USD at `t = 0.5` has PV `100 / 1.1^0.5`, or 95.35 USD. The year's discounted cash flow is **190.80 USD**.
- **2021:** the monthly factors sum to 10.40532, so revenue PV is 312.16 USD and OPEX PV is 52.03 USD. The year's discounted cash flow is **260.13 USD**.

### NPV and break-even

Values below are rounded for readability; the calculation uses unrounded values.

```
sum of 24 monthly factors = 21.85117
NPV = (30 - 5) * 21.85117 - 100 / 1.1^0.5
NPV = 450.93 USD

discounted oil = 10 * 21.85117
discounted oil = 218.512 Sm3
discounted gas = 100 * 21.85117
discounted gas = 2185.117 Sm3
discounted costs = 95.35 + 57.23 + 52.03 = 204.60 USD

net cost = discounted costs - 0.1 * discounted gas
break-even oil price = net cost / discounted oil
break-even oil price = -0.06366 USD/Sm3
```

Substituting **-0.06366 USD/Sm3** as the oil price gives NPV approximately zero with the same gas price. The price is negative because discounted gas revenue already exceeds discounted costs. IRR is not selected for this profile: net monthly inflows from January to June 2020 are received before the mid-2020 CAPEX, so the cash flow changes sign more than once. These prices are illustrative, not recommended asset assumptions.
