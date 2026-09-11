# How calculations work

This is a screening estimate from simulated production, constant prices, and the costs you enter. It does not model tax, financing, inflation, or costs you have not entered.

## Annual sales volumes

The calculation uses yearly-resampled cumulative ECLIPSE vectors. Oil comes from FOPT. For gas, it uses reported sales gas from FGST when available. Otherwise, it calculates sales gas from produced gas FGPT, less injected gas FGIT and consumed gas FGCT.

For each realization, we subtract consecutive cumulative values to estimate the volume produced in each calendar year.

```
annual volume = cumulative end - cumulative start
gas deductions = injected gas + consumed gas
derived sales gas = produced gas - gas deductions
```

The yearly samples must form complete consecutive calendar-year intervals. Missing, non-finite, or skipped annual samples make the affected financial result unavailable; they are not treated as zero. A missing gas component is only treated as zero after you accept that assumption.

Results use annually resampled data. Coverage of partial first and last years has not yet been verified; check the source production history before using these results for decisions.

## Realizations and ensemble results

The module calculates each realization separately. It does not first average production profiles and then calculate one economic result. A realization with incomplete oil or sales-gas data is excluded only from measures that need that product; an available volume measure can still be shown.

Charts, percentiles, and output channels use one finite calculated value from each eligible realization. The table count shows how many realizations are valid for the selected measure out of the selected realizations. Missing, unavailable, and undefined values are excluded, not set to zero.

Filtering changes the realizations shown in the chart and statistics. It does not move the automatic valuation year: that year is found from production data for the full selected ensemble and the module waits until every required source is available before calculating date-dependent values.

## Discounting and valuation year

Volumes and money received later contribute less at a positive discount rate. An 8% rate is written as 0.08 in the calculation.

```
discount factor = 1 / (1 + rate)^t
discounted volume = sum(annual volume * discount factor)
```

Here, `t` is the number of years from the valuation date to the assumed receipt or payment date. Results are valued at **1 January of the valuation year**. Unless you enter a year, the module uses the earliest production year in the full selected ensemble.

Mid-year or year-end timing applies to production revenue and operating expenditure (OPEX). Capital expenditure (CAPEX) is placed either at the start of the year or at the same time as the annual operating cash flow, according to investment timing.

Discounted volumes are **timing-weighted screening indicators, not reserves or recoverable volumes**. Discounting changes their weighting for comparison, not the simulated physical production.

## NPV

Net present value (NPV) is discounted revenue minus discounted costs over the selected evaluation period.

```
oil revenue = oil volume * oil price
gas revenue = sales gas volume * gas price
operating cash flow = oil revenue + gas revenue - OPEX

operating PV = operating cash flow * annual factor
investment PV = CAPEX * investment factor
annual present value = operating PV - investment PV
NPV = sum(annual present value)
```

You can explicitly exclude oil or gas revenue. Costs apply only in the years entered; unspecified years are zero, so an operating cost does not repeat through the remaining production horizon. Zero entered costs means the NPV is discounted revenue, not a complete project-profitability estimate.

## Break-even oil price

Break-even oil price is the constant oil price that makes NPV zero while keeping the gas price fixed.

```
net cost = discounted costs - discounted gas revenue
break-even oil price = net cost / discounted oil volume
```

The module reports break-even oil price when:

- Required production data are complete.
- Gas revenue is determined by a price, explicitly excluded, or confirmed zero.
- At least one non-zero CAPEX or OPEX entry falls inside the evaluation period.
- Discounted oil volume is sufficiently different from zero to support division.

You do not need to enter an oil price to calculate it. Break-even oil price can be negative when discounted gas revenue exceeds discounted costs.

## Internal rate of return

Internal rate of return (IRR) is the annual discount rate at which `NPV(IRR) = 0`. It is calculated from the cash flows, not from your selected discount rate.

The solver supports conventional cash flows: initial net outflows followed by net inflows, with only one change of sign after cash flows at the same time are combined. A non-conventional profile may have multiple roots, or none; the module does not select an IRR for such a profile. A profile with no change of sign has no finite IRR. A result is also unavailable if the root is outside the solver's supported range.

## Oil equivalents

## Oil equivalents, delta, and early value

Discounted oil equivalents add discounted oil to discounted gas divided by the configured gas-per-oil-equivalent conversion factor, after unit conversion. The default is 1000 Sm3 gas per Sm3 oil equivalent. This is a configurable oil-equivalent convention, not a price relationship; it does not determine gas revenue or break-even oil price.

## Delta ensembles

Delta vectors represent **comparison minus reference** for matching realizations. Enter incremental costs using the same convention: positive costs are additional expenditure and negative costs are savings relative to the reference.

The module calculates economics from these signed incremental profiles. For each matching realization, incremental NPV equals comparison NPV minus reference NPV when valuation date, timing, prices, discount rate, evaluation period, and data coverage are consistent and costs are comparison minus reference. This identity does not generally hold for differences between distribution percentiles.

Incremental IRR and break-even oil price are calculated from the incremental cash flows and volumes; they are **not differences between the two projects' IRRs or break-even prices**. Negative discounted incremental oil volume reverses oil-price sensitivity: a higher oil price reduces incremental NPV.

## Early value

Early values start at the selected evaluation start and include all years through the selected early end year. They use the same valuation date as the full evaluation; shortening the horizon does not rebase discounting. Full-evaluation outputs remain separate.

## Reading distributions and units

Each valid realization contributes one calculated value. P90 is the lower 10th percentile and P10 the upper 90th percentile. An exceedance curve shows the fraction of valid realizations strictly above a value; it is not automatically a probability of commercial success.

Display scaling such as million or billion improves readability only and is not applied to channel values. Volume channels use simulator volume units, NPV channels use the selected currency, IRR channels use percent, and break-even channels use the selected oil-price basis. Calculations retain full precision.

## Worked example

This illustrative example covers 2020 and 2021:

- Annual production: 100 Sm3 oil and 1000 Sm3 sales gas in each year.
- Prices: 2 USD/Sm3 oil and 0.1 USD/Sm3 gas, constant in both years.
- Discount rate: 10%, valued at 1 January 2020.
- Timing: year-end revenue and OPEX; start-of-year CAPEX.
- Costs: CAPEX of 100 USD and OPEX of 10 USD in 2020 only.

### Annual cash flows

- **2020:** revenue is 300 USD. After OPEX, 290 USD is received at year-end. CAPEX of 100 USD is paid at the valuation date. Net present value for the year is `290 / 1.1 - 100`, or **163.64 USD**.
- **2021:** revenue is 300 USD, with no entered costs. Net present value for the year is `300 / 1.1^2`, or **247.93 USD**.

### NPV and break-even

Values below are rounded for readability; the calculation uses unrounded values.

```
NPV = 290 / 1.1 + 300 / 1.1^2 - 100
NPV = 411.57 USD

discounted oil = 100 / 1.1 + 100 / 1.1^2
discounted oil = 173.554 Sm3
discounted gas = 1000 / 1.1 + 1000 / 1.1^2
discounted gas = 1735.537 Sm3
discounted costs = 100 + 10 / 1.1
discounted costs = 109.09 USD

net cost = discounted costs - 0.1 * discounted gas
break-even oil price = net cost / discounted oil
break-even oil price = -0.37143 USD/Sm3
```

Substituting **-0.37143 USD/Sm3** as the oil price gives NPV approximately zero with the same gas price. The price is negative because discounted gas revenue already exceeds discounted costs. These prices are illustrative, not recommended asset assumptions.
