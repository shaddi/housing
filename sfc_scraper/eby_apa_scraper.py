# Takes about 50 minutes

import os

# The base url for Craigslist
region = 'sfbay'
location = 'eby'
search_type = 'apa'

# If we wish to narrow down by price
max_price = 20000
# Ignore entries that don't list a price
min_price = 1

execfile("sfbay_craigslist_nbhd_scraper.py")

