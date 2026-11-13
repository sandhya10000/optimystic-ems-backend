const escapeHtml = (value = "") =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

// Convert amount into Indian currency words
const numberToWords = (num) => {
  num = Math.floor(Number(num) || 0);

  if (num === 0) return "Zero";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const belowThousand = (n) => {
    let result = "";

    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }

    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }

    if (n > 0) result += ones[n] + " ";

    return result.trim();
  };

  let result = "";

  const crore = Math.floor(num / 10000000);
  num %= 10000000;

  const lakh = Math.floor(num / 100000);
  num %= 100000;

  const thousand = Math.floor(num / 1000);
  num %= 1000;

  if (crore) result += belowThousand(crore) + " Crore ";
  if (lakh) result += belowThousand(lakh) + " Lakh ";
  if (thousand) result += belowThousand(thousand) + " Thousand ";
  if (num) result += belowThousand(num);

  return result.trim();
};

const generateSalarySlipHTML = (data) => {
  const {
    employeeName,
    employeeId,
    designation,
    department,
    email,
    month,
    year,
    paymentDate,
    basicSalary = 0,
    allowances = 0,
    deductions = 0,
    netSalary = 0,

    // Optional employee details
    panNumber,
    dateOfJoining,

    // Optional salary breakdown
    hra = 0,
    specialAllowance,
    professionalTax = 0,
    pfDeduction = 0,
    tds = 0,
    otherDeductions = 0,
  } = data;

  const safe = escapeHtml;

  // If no separate allowance breakdown is provided,
  // show the complete allowance amount as Special Allowance.
  const hraAmount = Number(hra) || 0;

  const specialAllowanceAmount =
    specialAllowance !== undefined
      ? Number(specialAllowance) || 0
      : Math.max(0, Number(allowances) - hraAmount);

  const totalEarnings =
    Number(basicSalary) + hraAmount + specialAllowanceAmount;

  // If only total deductions are provided,
  // show them under Other Deductions.
  const specifiedDeductions =
    Number(professionalTax) +
    Number(pfDeduction) +
    Number(tds) +
    Number(otherDeductions);

  const finalOtherDeductions =
    specifiedDeductions > 0 ? Number(otherDeductions) : Number(deductions);

  const totalDeductions =
    Number(professionalTax) +
    Number(pfDeduction) +
    Number(tds) +
    finalOtherDeductions;

  const finalNetSalary =
    netSalary !== undefined
      ? Number(netSalary)
      : totalEarnings - totalDeductions;

  const amountInWords = numberToWords(finalNetSalary) + " Only";

  const monthYear = `${month || ""} ${year || ""}`.trim();

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />

    <title>Salary Slip - ${safe(employeeName)}</title>

    <style>
      * {
        box-sizing: border-box;
      }

      @page {
        size: A4;
        margin: 0;
      }

      body {
        margin: 0;
        padding: 0;
        font-family: Arial, Helvetica, sans-serif;
        color: #172b4d;
        background: #ffffff;
      }

      .salary-slip {
        width: 100%;
        min-height: 1122px;
        background: #ffffff;
        position: relative;
      }

      /* HEADER */

      .header {
        background: #172e52;
        color: #ffffff;
        padding: 24px 6.5%;
        border-bottom: 7px solid #19869a;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .company-name {
        font-size: 23px;
        font-weight: 700;
        letter-spacing: 0.3px;
        margin-bottom: 7px;
      }

      .company-subtitle {
        font-size: 14px;
        color: #c4d5ed;
      }

      .header-right {
        text-align: right;
      }

      .payslip-title {
        font-size: 32px;
        font-weight: 700;
        letter-spacing: 1px;
      }

      .salary-month {
        margin-top: 7px;
        font-size: 16px;
        color: #d1def0;
      }

      .payment-date {
        margin-top: 10px;
        font-size: 14px;
        color: #d1def0;
      }

      /* MAIN CONTENT */

      .content {
        padding: 32px 6.5% 25px;
      }

      .section-title {
        font-size: 16px;
        font-weight: 700;
        color: #172e52;
        border-left: 5px solid #19869a;
        padding: 3px 0 3px 10px;
        margin-bottom: 15px;
        text-transform: uppercase;
      }

      /* EMPLOYEE DETAILS */

      .details-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border: 1px solid #cbd7e5;
        border-radius: 7px;
        overflow: hidden;
        margin-bottom: 33px;
      }

      .details-table td {
        width: 50%;
        padding: 8px 20px;
        border-right: 1px solid #cbd7e5;
        border-bottom: 1px solid #cbd7e5;
        background: #edf2f8;
        vertical-align: middle;
      }

      .details-table tr:last-child td {
        border-bottom: none;
      }

      .details-table td:last-child {
        border-right: none;
      }

      .detail-label {
        font-size: 11px;
        color: #64748b;
        text-transform: uppercase;
        margin-bottom: 2px;
      }

      .detail-value {
        font-size: 15px;
        font-weight: 700;
        color: #172b4d;
        min-height: 17px;
        word-break: break-word;
      }

      /* EARNINGS AND DEDUCTIONS */

      .salary-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
        border: 1px solid #cbd7e5;
      }

      .salary-table th {
        background: #172e52;
        color: #ffffff;
        padding: 13px 17px;
        text-align: left;
        font-size: 14px;
        font-weight: 700;
      }

      .salary-table th.amount,
      .salary-table td.amount {
        text-align: right;
      }

      .salary-table td {
        padding: 13px 17px;
        font-size: 14px;
        border-bottom: 1px solid #e0e7ef;
      }

      .salary-table tbody tr:nth-child(even) {
        background: #edf2f8;
      }

      .salary-table tbody tr:nth-child(odd) {
        background: #ffffff;
      }

      .salary-table .total-row {
        background: #dce6f2 !important;
        font-weight: 700;
        color: #172e52;
      }

      .salary-table .total-row td {
        border-bottom: none;
        font-size: 15px;
      }

      .salary-table th:nth-child(2),
      .salary-table td:nth-child(2) {
        border-right: 1px solid #cbd7e5;
      }

      /* NET PAYABLE */

      .net-payable {
        background: #e6f3eb;
        border: 2px solid #16869a;
        border-radius: 10px;
        padding: 17px 26px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        margin-top: 30px;
      }

      .net-label {
        font-size: 13px;
        font-weight: 700;
        color: #64748b;
        margin-bottom: 6px;
      }

      .net-amount {
        font-size: 36px;
        font-weight: 700;
        color: #172e52;
      }

      .amount-words {
        text-align: right;
        max-width: 55%;
      }

      .words-label {
        font-size: 11px;
        color: #64748b;
        margin-bottom: 9px;
      }

      .words-value {
        font-size: 14px;
        font-weight: 700;
        color: #172b4d;
        line-height: 1.5;
      }

      /* FOOTER */

      .footer {
        margin: 55px 6.5% 25px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        color: #64748b;
        font-size: 12px;
      }

      .footer-note {
        max-width: 55%;
        line-height: 1.6;
      }

      .signature {
        width: 180px;
        border-top: 1px solid #94a3b8;
        padding-top: 9px;
        text-align: center;
        font-weight: 600;
      }

      .confidential {
        text-align: center;
        margin-top: 25px;
        font-size: 10px;
        color: #94a3b8;
      }

      @media print {
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }

        .salary-slip {
          min-height: 297mm;
        }

        .header,
        .salary-table th,
        .net-payable,
        .details-table td,
        .salary-table tr {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
      }
    </style>
  </head>

  <body>

    <div class="salary-slip">

      <!-- HEADER -->

      <div class="header">

        <div class="header-left">
          <div class="company-name">
            OPTIMYSTIC AUXILIARY SERVICES PVT. LTD.
          </div>

          <div class="company-subtitle">
            Confidential Employee Document
          </div>
        </div>

        <div class="header-right">
          <div class="payslip-title">
            PAYSLIP
          </div>

          <div class="salary-month">
            ${safe(monthYear)}
          </div>

          <div class="payment-date">
            Payment Date: ${safe(paymentDate)}
          </div>
        </div>

      </div>

      <div class="content">

        <!-- EMPLOYEE DETAILS -->

        <div class="section-title">
          Employee Details
        </div>

        <table class="details-table">

          <tr>
            <td>
              <div class="detail-label">Employee Name</div>
              <div class="detail-value">
                ${safe(employeeName)}
              </div>
            </td>

            <td>
              <div class="detail-label">Designation</div>
              <div class="detail-value">
                ${safe(designation || "N/A")}
              </div>
            </td>
          </tr>

          <tr>
            <td>
              <div class="detail-label">Employee Code</div>
              <div class="detail-value">
                ${safe(employeeId)}
              </div>
            </td>

            <td>
              <div class="detail-label">PAN Card Number</div>
              <div class="detail-value">
                ${safe(panNumber || "N/A")}
              </div>
            </td>
          </tr>

          <tr>
            <td>
              <div class="detail-label">Date of Joining</div>
              <div class="detail-value">
                ${safe(dateOfJoining || "N/A")}
              </div>
            </td>

            <td>
              <div class="detail-label">Salary Month</div>
              <div class="detail-value">
                ${safe(monthYear)}
              </div>
            </td>
          </tr>

          <tr>
            <td>
              <div class="detail-label">Salary Date</div>
              <div class="detail-value">
                ${safe(paymentDate)}
              </div>
            </td>

            <td>
              <div class="detail-label">Net Payable</div>
              <div class="detail-value">
                Rs. ${formatCurrency(finalNetSalary)}
              </div>
            </td>
          </tr>

        </table>

        <!-- EARNINGS AND DEDUCTIONS -->

        <div class="section-title">
          Earnings &amp; Deductions
        </div>

        <table class="salary-table">

          <thead>
            <tr>
              <th>EARNINGS</th>
              <th class="amount">AMOUNT (Rs.)</th>
              <th>DEDUCTIONS</th>
              <th class="amount">AMOUNT (Rs.)</th>
            </tr>
          </thead>

          <tbody>

            <tr>
              <td>Basic Salary</td>
              <td class="amount">
                ${formatCurrency(basicSalary)}
              </td>

              <td>Professional Tax</td>
              <td class="amount">
                ${formatCurrency(professionalTax)}
              </td>
            </tr>

            <tr>
              <td>HRA</td>
              <td class="amount">
                ${formatCurrency(hraAmount)}
              </td>

              <td>PF Deduction</td>
              <td class="amount">
                ${formatCurrency(pfDeduction)}
              </td>
            </tr>

            <tr>
              <td>Special Allowance</td>
              <td class="amount">
                ${formatCurrency(specialAllowanceAmount)}
              </td>

              <td>TDS</td>
              <td class="amount">
                ${formatCurrency(tds)}
              </td>
            </tr>

            <tr>
              <td>Other Earnings</td>
              <td class="amount">
                ${formatCurrency(
                  Math.max(
                    0,
                    Number(allowances) - hraAmount - specialAllowanceAmount,
                  ),
                )}
              </td>

              <td>Other Deductions</td>
              <td class="amount">
                ${formatCurrency(finalOtherDeductions)}
              </td>
            </tr>

            <tr class="total-row">
              <td>Total Earnings</td>
              <td class="amount">
                ${formatCurrency(totalEarnings)}
              </td>

              <td>Total Deductions</td>
              <td class="amount">
                ${formatCurrency(totalDeductions)}
              </td>
            </tr>

          </tbody>

        </table>

        <!-- NET PAYABLE -->

        <div class="net-payable">

          <div>
            <div class="net-label">
              NET PAYABLE
            </div>

            <div class="net-amount">
              Rs. ${formatCurrency(finalNetSalary)}
            </div>
          </div>

          <div class="amount-words">

            <div class="words-label">
              AMOUNT IN WORDS
            </div>

            <div class="words-value">
              Rupees ${safe(amountInWords)}
            </div>

          </div>

        </div>

      </div>

      <!-- FOOTER -->

      <div class="footer">

        <div class="footer-note">
          This is a computer-generated salary slip
          and does not require a physical signature.
          <br />
          For any payroll-related queries, please contact HR.
        </div>

        <div class="signature">
          Authorized Signature
        </div>

      </div>

      <div class="confidential">
        OPTIMYSTIC AUXILIARY SERVICES PVT. LTD.
        | Confidential Employee Document
      </div>

    </div>

  </body>
  </html>
  `;
};

module.exports = generateSalarySlipHTML;
