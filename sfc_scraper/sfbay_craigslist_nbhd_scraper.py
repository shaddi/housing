# Load the scraping library
# An alternative would be the mechanize library
from scrapemark import scrape
# Regular expressions
import re
# Basic webpage library
import urllib2
# To get the local time
from datetime import datetime
# For system calls
import os 

#key = 'ABQIAAAA-NgCz43Ca2477hZRZfa_FRSiXr9Ixf3duqcZ99mp_W37smOlHBT-xPJ02WT_Q7K67b_JSKamB1Lc3w&'
key = 'ABQIAAAAnfs7bKE82qgb3Zc2YyS-oBT2yXp_ZAY8_ufC3CFXhHIE1NvwkxSySz_REpPq-4WZA27OwgbtyR3VcA&'

# Set up file names
base_url = "http://" + region + ".craigslist.org"
filename = 'tmpfile_' + location + '_' + search_type + '.xml'
final_filename = region + '-' + location + '-' + search_type + '.xml'

# Get all neighborhoods in the desired region
cur_url = base_url + "/" + location + "/" + search_type + "/"
print "Grabbing neighborhoods from " + str(cur_url)
neighborhoods = scrape("""  <select name="nh"> {{ |html }} </select> """, url = cur_url)
neighborhoods = re.sub(r"\"", "'", neighborhoods)
neighborhoods = re.sub(r"\n", "</option>", neighborhoods)
locations = scrape(""" {* <option> {{[] }} *}""", neighborhoods)
locations = locations[1:]
neighborhoods = re.sub(r"<option value=''>", "", neighborhoods)
neighborhoods = re.sub(r"[<>]", " ", neighborhoods)
neighborhood_numbers = scrape(""" {* value='{{ []|int }}' *}""", neighborhoods)

# Now go through the listing pages and get all the urls of the relevant houses and scrape the individual pages of the houses.
outfile = open(filename, 'w')
outfile.write("<db maxPrice=\"" + str(max_price) + "\" lastUpdated=\"" + datetime.today().strftime("%a, %D, %I:%M%p") + "\">\n")
outfile.write("  <listings>\n")
index = 0
entries = []
nindex = 0
os.system("echo ''")
os.system("date")
print "Scraping " + location
for neighborhood in neighborhood_numbers:
    # only look at berkeley
    #
    nindex = nindex + 1
    neighborhood_name = str(locations[index]).title()
    print "Neighborhood: " + neighborhood_name + " (" + str(neighborhood) + ") " + " - " + str(nindex) + " of " + str(len(neighborhood_numbers))
#    if neighborhood_name != "Berkeley"  and neighborhood_name !="Alameda":
#    	index = index + 1
#        continue
    cur_url = base_url + "/search/" + search_type + "/" + location + "?query=&catAbbreviation=" + search_type + "&minAsk=" + str(min_price) + "&maxAsk=" + str(max_price) + "&bedrooms=&nh=" + str(neighborhood) + "&hasPic=1"
    while True:
        try:
	   cur_entries = scrape(""" {* <p> <a href='{{ [].link }}'>{{ [].description|html }}</a> <font> ({{ [].neighborhood }}) </font></p> *} """, url = cur_url)
	except:
           break
        entries = entries + cur_entries

        print "Grabbed " + str(len(cur_entries)) + " entries from " + neighborhood_name + ", " + location + " for a total of " + str(len(entries)) + " " + cur_url  

        for entry in cur_entries:
            # Pause since Google's Geocoder gets unhappy if we ping it too quickly
            os.system("sleep 0.15")

            # Get the url of the craigslist ad
            entry_url = str(entry['link'])

            # Download the entries page to get the details
            try: 
                f = urllib2.urlopen(entry_url)
                webpage = f.read()
                f.close()
                webpage = re.sub("[\n\t]", " ", webpage)
            except:
                print "Error reading url " + entry_url
                continue 

            try:    
                # Get the location information
                location_info = re.search(r"<!-- START CLTAGS --> .* <!-- END CLTAGS -->", webpage)
                if location_info == None:
                    continue
                else:
                    location_info = location_info.group(0)
                location_info = re.sub("!","", location_info)
                entry_xstreet0 = scrape(""" xstreet0={{ }} --> """, location_info)
                if entry_xstreet0 != None:
                    entry_xstreet0 = entry_xstreet0.encode("utf-8")
                entry_xstreet1 = scrape(""" xstreet1={{ }} --> """, location_info)
                if entry_xstreet1 != None:
                    entry_xstreet1 = entry_xstreet1.encode("utf-8")
                entry_address = scrape(""" --> {{ }} <small> """, location_info)
                if entry_address == None:
                    entry_address = ""
                else:
                    entry_address = str(entry_address)
                    entry_address = re.sub("[\n\t]", " ", entry_address)
                    entry_address = re.sub(" & "," and ", entry_address)
                    entry_address = re.sub("&","and", entry_address)
                    entry_address = re.sub(r"\"", "'", entry_address)
                entry_maps_ref = scrape(""" <a href='{{ }}'>google map</a> """, location_info)
                entry_maps_ref2 = scrape(""" <a href='http://maps.google.com{{ }}'> """, webpage)
                if entry_maps_ref2 != None:
                    entry_maps_ref2 = str("http://maps.google.com" + entry_maps_ref2)
                if entry_maps_ref == None and entry_maps_ref2 != None:
                    entry_maps_ref = entry_maps_ref2
                if entry_maps_ref != None:
                    entry_maps_ref = str(entry_maps_ref)
                else:
                    continue
            except:
                continue

            # Now must communicate with Google maps to get the actual lat/long of the entry_maps_ref
            try:
                geocoding_base = "http://maps.google.com/maps/geo?output=csv&sensor=false&key=" + key
                geocoding_loc = re.search("q=.*", entry_maps_ref).group(0)
                geocoding_url = geocoding_base + geocoding_loc
            except:
                continue
            try: 
                f = urllib2.urlopen(geocoding_url)
                entry_geocode = f.read()
                f.close()
            except:
                print "Error reading url " + geocoding_url
                continue 

            try:
                if (cmp(entry_geocode[0:3], str(200)) != 0):
                    if (cmp(entry_geocode[0:3], str(602)) != 0):
                        print entry_geocode
                    continue
                entry_lat = entry_geocode.split(",")[2]
                entry_long = entry_geocode.split(",")[3]

                # Get the post date
                entry_date = str(scrape(""" Date: {{ }}, """, webpage))
    
                # Get the craigslist id
                entry_id = re.search(r"[0-9]+", entry_url).group(0)
    
                # Get the list price
                entry_price = re.search(r"\$[0-9]+", entry['description']).group(0)[1:]
    
                # Get the number of bedrooms, =-1 if not present
                has_bedroom = re.search(r"[0-9]+[bB][rR]", entry['description'])
                if has_bedroom != None:
                    entry_bedroom = str(re.search(r"[0-9]+", has_bedroom.group(0)).group(0))
                else:
                    entry_bedroom = ""
    
                # Get the short description from the title
                entry_description = re.sub(r"^\$[0-9]+ / [0-9]+[Bb][Rr] - ", "", entry['description'])[:-2]
                entry_description = re.sub(r"^\$[0-9]+ ", "", entry_description)
                entry_description = re.sub(r"\"", "'", entry_description)
    
                # Get the neighborhood (ex/ Palo Alto)
                entry_neighborhood = str(entry['neighborhood']).title()
                
                # Get whether or not pets are allowed
                pets = "no"
                dogs = re.search(r"dogs are OK - wooof", webpage)
                cats = re.search(r"cats are OK - purrr", webpage)
                if cats != None or dogs != None:
                    pets = "yes"
            except:
                continue    

            outfile.write('    <listing id="' + entry_id + '" url="' + entry_url + '" postingDate="' + entry_date + '" totalPrice = "' + entry_price + '" numBedrooms="' + entry_bedroom + '" pets="' + pets + '" description="' + entry_description + '" neighborhood="' + entry_neighborhood + '">\n')
            outfile.write('      <location description="' + entry_address + '" lat="' + entry_lat + '" lng="' + entry_long + '">\n')
            outfile.write('      </location>\n')
            outfile.write('    </listing>\n')

        try:
            next_line = scrape(""" <a href='{{ }}'> <b>Next&gt;&gt;</b></a> """, url = cur_url) 
            if next_line == None:
                break
            else:
                cur_url = base_url + str(next_line)
        except:
            break

    index = index + 1

outfile.write("  </listings>\n")
outfile.write("</db>\n")
outfile.close()
os.system("date")

os.system("touch " + final_filename)
os.system("rm " + final_filename)
os.system("cat " + filename + " | sed 's/[[:space:]]/ /g' | sed 's/[^ [:alnum:][:punct:]]//g' | sed 's/\&#[0-9A-F]*;//g' | sed 's/\&[a-zA-Z]*;//g' | sed 's/\&//g' > " + final_filename)
os.system("rm " + filename)
os.system("mv " + final_filename + " ../data")

