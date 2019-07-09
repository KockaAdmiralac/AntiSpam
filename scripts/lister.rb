require 'uri'
require 'httparty'

# Method to find all pages from a namespace
# @param [Number] apfrom - Listing offset
def api_call(apfrom = nil)
  if(apfrom and $letter != apfrom[0])
    puts "Currently at letter #{apfrom[0]}."
    $letter = apfrom[0]
  end
  data = JSON.parse(
    HTTParty.get(
      $base_url +
      (
        apfrom ?
          "&apfrom=#{URI.escape(apfrom, Regexp.new("[^#{URI::PATTERN::UNRESERVED}]"))}" :
          ''
      )
    ).body,
    :symbolize_names => true
  )
  $arr += data[:query][:allpages].map{|o| o[:title] }
  if data[:'query-continue']
    api_call(data[:'query-continue'][:allpages][:apfrom])
  end
end

# Defining variables
$arr = []
puts 'Wiki URL (without protocol, for example kocka.fandom.com):'
wiki = gets.chomp
puts 'Namespace IDs (separated by commas, no spaces please):'
namespacearr = gets.chomp.split(',')
namespacearr.each {|n|
  $ind = 0
  $letter = ''
  $base_url = "https://#{wiki}/api.php?action=query&list=allpages&aplimit=500&apnamespace=#{n}&apfilterredir=all&format=json"
  puts "Listing namespace #{n}."
  api_call
}

puts $arr.length
# Dump results to file on exit
File.open('results/lister.txt', 'w+') do |f|
  f.write($arr.uniq.join("\n"))
end
puts 'Finished listing pages.'
