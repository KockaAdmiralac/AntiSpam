require 'uri'
require 'httparty'

# Method to find all pages from a namespace.
# @param [Number] apfrom - Listing offset
def api_call(ns, apfrom = nil)
  if(apfrom and $letter != apfrom[0])
    puts "Currently at letter #{apfrom[0]}."
    $letter = apfrom[0]
  end
  data = JSON.parse(
    HTTParty.get(
	  $base_url,
	  :query => {
	    :action => 'query',
	    :apfrom => apfrom,
		:list => 'allpages',
		:aplimit => 'max',
		:apnamespace => ns,
		:apfilterredir => 'nonredirects',
		:format => 'json'
	  }
	).body,
	symbolize_names: true
  )
  if data and data[:query]
    $arr += data[:query][:allpages].map{|o| o[:title] }
    api_call(ns, data[:'query-continue'][:allpages][:apfrom]) if(data[:'query-continue'])
  end
end

def api_call2(pages, eloffset = nil)
  begin
    data = JSON.parse(
      HTTParty.get(
	    $base_url,
	    :query => {
	      :action => 'query',
	      :prop => 'extlinks',
	      :ellimit => 'max',
	      :eloffset => eloffset,
	      :format => 'json',
	      :titles => pages.join('|')
	    }
	  ).body,
      symbolize_names: true
    )
  rescue
    puts 'rip.'
  end
  if(data and data[:query])
    data[:query][:pages].each do |k, v|
	  links = v[:extlinks]
	  $res += links.map {|l| l[:'*'] } if links
	end
	api_call2(pages, data[:'query-continue'][:extlinks][:eloffset]) if data[:'query-continue']
  end
end

# Defining variables.
$arr = []
$res = []
puts 'Enter wiki URL (without protocol, for example kocka.fandom.com):'
$base_url = "https://#{gets.chomp}/api.php"
puts 'Namespace IDs (separated by commas, no spaces please):'
namespacearr = gets.chomp.split(',')
namespacearr.each {|n|
  $ind = 0
  $letter = ''
  puts "Listing namespace #{n}."
  api_call(n)
}
while $arr.length > 0
  api_call2($arr.shift(50))
end

# Dump results to file on exit.
File.open('results/links.txt', 'w+') do |f|
  f.write($res.uniq.join("\n"))
end
puts 'Finished searching for links.'
