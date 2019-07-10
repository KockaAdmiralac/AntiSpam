require 'uri'
require 'httparty'

# CONFIGURATION STARTS HERE
# First user ID that will be fetched.
$ind = 27599644
# Last user ID that will be fetched.
LAST_INDEX = 34875520
# END CONFIGURATION
$res = []

def log_sites
  File.open('results/profiles.txt', 'a') do |f|
    f.puts $res.uniq.join("\n")
    $res = [] # fuck mutex
  end
end

def thread_main
  loop do
    begin
      return if $ind > LAST_INDEX
      ind = $ind
      $ind += 20 # fuck mutex
      str = []
      for i in ind...$ind do
        str << "id=#{i}"
      end
      res = HTTParty.get("https://services.fandom.com/user-attribute/user/bulk?#{str.join("&")}")
      if res
        prop = JSON.parse(res.body, :symbolize_names => true)
        if prop[:users]
          prop[:users].each do |key, value|
            if value[:website] and value[:website] != ""
              $res << "#{key} | #{value[:username]} | #{value[:website]}"
            end
          end
        end
      else
        puts "NO RES ON #{ind}"
      end
    rescue Exception => e
      puts e
    end
  end
end

Thread.new do
  loop do
    sleep(5)
    puts "#{$ind}/#{LAST_INDEX}"
  end
end

Thread.new do
  loop do
    sleep(20)
    log_sites
  end
end

24.times do
  Thread.new do
    thread_main
  end
end
thread_main

log_sites
