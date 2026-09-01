import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

doc = Document()

# Page Margins
sections = doc.sections
for section in sections:
    section.top_margin = Inches(0.8)
    section.bottom_margin = Inches(0.8)
    section.left_margin = Inches(0.8)
    section.right_margin = Inches(0.8)

# Title
title_p = doc.add_paragraph()
title_run = title_p.add_run("FREELANCE SOFTWARE DEVELOPMENT & LAUNCH AGREEMENT")
title_run.font.name = "Arial"
title_run.font.size = Pt(18)
title_run.font.bold = True
title_run.font.color.rgb = RGBColor(249, 115, 22) # Orange #f97316

sub_p = doc.add_paragraph()
sub_run = sub_p.add_run("DASHit Version 1.0 — Quick Commerce Platform")
sub_run.font.name = "Arial"
sub_run.font.size = Pt(11)
sub_run.font.bold = True
sub_run.font.color.rgb = RGBColor(194, 65, 12)

# Meta Table
meta_p = doc.add_paragraph()
meta_p.add_run("Agreement Date: ").bold = True
meta_p.add_run("1st September 2026\n")
meta_p.add_run("Project Name: ").bold = True
meta_p.add_run("DASHit Quick Commerce App & Website\n")
meta_p.add_run("Fixed Developer Fee: ").bold = True
meta_p.add_run("₹35,000 INR\n")
meta_p.add_run("Estimated Timeline: ").bold = True
meta_p.add_run("15 Days")

def add_heading(text, level=2):
    h = doc.add_paragraph()
    run = h.add_run(text)
    run.font.name = "Arial"
    run.font.size = Pt(14 if level==2 else 12)
    run.font.bold = True
    run.font.color.rgb = RGBColor(2, 132, 199) # Blue #0284c7
    return h

# Section 1
add_heading("1. PARTIES TO THE AGREEMENT", 2)
p_dev = doc.add_paragraph()
p_dev.add_run("DEVELOPER / CONTRACTOR:\n").bold = True
p_dev.add_run("Name: Muhammad Aleem Kanyu\nPhone: 9622720283\nEmail: skyimedia7@gmail.com\n")

p_cli = doc.add_paragraph()
p_cli.add_run("CLIENT:\n").bold = True
p_cli.add_run("Name: Azan Iqbal Mir\nBusiness Brand Name: DASHit Quick Commerce\nCustomer Support Line: 6006990032\n")

# Section 2
add_heading("2. ALL FEATURES INCLUDED IN VERSION 1.0", 2)

add_heading("A. App Appearance & Design Architecture", 3)
doc.add_paragraph("• DASHit Brand Identity: Vibrant Orange ('DASH') and Electric Blue ('it') responsive user interface.", style='List Bullet')
doc.add_paragraph("• Flexible Store Rules: Ability to configure dynamic delivery time windows (such as a morning bakery delivery rule).", style='List Bullet')
doc.add_paragraph("• Location Nickname Saver: Customers can save and switch custom location names (such as 'Home' or 'Work').", style='List Bullet')

add_heading("B. Customer Ordering App (iOS & Android Compatible)", 3)
doc.add_paragraph("• Product catalog search bar and grocery/food category navigation.", style='List Bullet')
doc.add_paragraph("• 2-Minute Edit/Cancel Timer: Active 120-second countdown timer allowing customers to modify or cancel orders.", style='List Bullet')
doc.add_paragraph("• Payment Gateway Integration: Online UPI (PhonePe, GPay, Paytm), Debit/Credit Cards, and Cash on Delivery (COD).", style='List Bullet')
doc.add_paragraph("• Influencer Discount Coupons: Promotional coupon system (such as code ANANTNAG10).", style='List Bullet')
doc.add_paragraph("• Money Saved Summary: Display showing customers total money saved on their purchase.", style='List Bullet')
doc.add_paragraph("• Direct Helpline Button: One-tap phone connection to customer support (6006990032).", style='List Bullet')

add_heading("C. Live Scooter Driver Tracking System", 3)
doc.add_paragraph("• Live Moving Driver Map: Customers watch the delivery scooter move live on a map during fulfillment.", style='List Bullet')
doc.add_paragraph("• Zero Monthly Map API Fees: Built using OpenStreetMap to eliminate monthly map provider bills.", style='List Bullet')

add_heading("D. Dark Store Admin Control Panel (/admin)", 3)
doc.add_paragraph("• Order Manager: Order status management (Paid -> Packing -> Out for Delivery -> Delivered).", style='List Bullet')
doc.add_paragraph("• Store Power Switch: Master control button to turn store ordering ON or OFF.", style='List Bullet')
doc.add_paragraph("• Coupon & Blacklist Manager: Panel to create discount codes and block non-responsive customers from Cash on Delivery.", style='List Bullet')

add_heading("E. Scooter Delivery Partner App (/driver)", 3)
doc.add_paragraph("• Driver order view, live GPS tracking toggle, and 4-digit customer delivery verification OTP modal.", style='List Bullet')

# Out of scope note
out_p = doc.add_paragraph()
out_run = out_p.add_run("OUT-OF-SCOPE FEATURES (EXTRA COST AND TIME):\nAny feature or module NOT explicitly listed above (such as multi-vendor store portals, multiple dark stores, wallet cashback systems, automated AI inventory forecasting, or multi-language translation) is an additional feature request. Extra features requested later will be quoted separately under a formal written Change Order for additional cost and extended timeline.")
out_run.font.size = Pt(10)
out_run.font.color.rgb = RGBColor(153, 27, 27)

# Section 3
add_heading("3. FINANCIAL TERMS AND INFRASTRUCTURE RESPONSIBILITY", 2)

f_p1 = doc.add_paragraph()
f_p1.add_run("FIXED DEVELOPER SERVICE PRICE: ₹35,000 INR\nThe total fixed developer software engineering service fee is ₹35,000 INR.").bold = True

f_p2 = doc.add_paragraph()
f_p2.add_run("DEVELOPER PROCUREMENT ASSISTANCE:\nWhile the financial cost of domain registration and web hosting server plans is paid directly by the client, the developer will provide full technical assistance during purchasing to ensure the client selects the correct server specifications and domain extensions.")

f_p3 = doc.add_paragraph()
f_p3.add_run("DOMAIN REGISTRATION VS. SERVER HOSTING:\nPurchasing a domain name (such as dashit.co.in) only reserves the website address name. A domain alone does not include server hosting. The client must rent a web hosting server to host application files, Node.js runtime, databases, and real-time map servers.")

f_p4 = doc.add_paragraph()
f_p4.add_run("SERVER HOSTING AND USER TRAFFIC SCALING:\nVersion 1.0 is engineered specifically for startup efficiency. Server hosting load scales according to customer traffic and active orders. If customer traffic increases significantly over time, the client may need to upgrade to a larger server hosting plan. Any server upgrade or cloud bandwidth costs resulting from user growth are the sole financial responsibility of the client.")

# Table
table = doc.add_table(rows=4, cols=3)
table.alignment = WD_TABLE_ALIGNMENT.CENTER
hdr_cells = table.rows[0].cells
hdr_cells[0].text = "Milestone"
hdr_cells[1].text = "Trigger / Deliverable"
hdr_cells[2].text = "Amount (INR)"

milestones = [
    ("1. Advance Deposit", "Upon signing agreement (Before work begins)", "40% (₹14,000)"),
    ("2. Mid-Project Demo", "Upon review of live working app demo", "40% (₹14,000)"),
    ("3. Final Launch", "Upon live server deployment & store submission", "20% (₹7,000)")
]

for i, (m, t, a) in enumerate(milestones, start=1):
    row_cells = table.rows[i].cells
    row_cells[0].text = m
    row_cells[1].text = t
    row_cells[2].text = a

add_heading("4. WARRANTY AND SUPPORT", 2)
doc.add_paragraph("Includes 15 days of free post-launch support for Version 1.0 bug fixes. Ongoing monthly maintenance after 15 days is optional under a separate monthly maintenance agreement.")

add_heading("SIGNATURES & ELECTRONIC ACCEPTANCE", 2)

sig_table = doc.add_table(rows=1, cols=2)
sig_cells = sig_table.rows[0].cells
sig_cells[0].text = "DEVELOPER / CONTRACTOR\n\nSignature: ___________________________\nName: Muhammad Aleem Kanyu\nDate: 1st September 2026"
sig_cells[1].text = "CLIENT ACCEPTANCE\n\nSignature: ___________________________\nName: Azan Iqbal Mir\nDate: 1st September 2026"

doc.save("DASHit_Contract_Version1.docx")
print("DASHit_Contract_Version1.docx updated with today's date!")
