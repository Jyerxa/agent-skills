import csv
import sys
from datetime import date

from lendwise import config
from lendwise.infrastructure.sql_repository import SqlLoanRepository
from lendwise.reporting.portfolio_report import PortfolioReportBuilder


def main() -> None:
    as_of = date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else date.today()
    report = (
        PortfolioReportBuilder(SqlLoanRepository(config.DATABASE_URL))
        .as_of(as_of)
        .including_delinquent()
        .build()
    )
    out = csv.writer(sys.stdout)
    out.writerow(["loan_id", "status", "balance", "apr", "accrued_interest"])
    for r in report.rows:
        out.writerow([r.loan_id, r.status, r.balance, r.apr, r.accrued_interest])
    out.writerow(["TOTAL", "", report.total_balance, report.weighted_average_apr, report.total_accrued_interest])


if __name__ == "__main__":
    main()
