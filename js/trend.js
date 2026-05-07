(function(){
  var DEFAULT_BIN_MINUTES = 15;

  function pad2(value){
    return String(value).padStart(2, '0');
  }

  function isValidDate(value){
    return value instanceof Date && !isNaN(value.getTime());
  }

  function formatDateTime(date){
    if(!isValidDate(date)) return '';
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()) + ' ' +
      pad2(date.getHours()) + ':' + pad2(date.getMinutes());
  }

  function formatShortLabel(date, includeDate){
    if(!isValidDate(date)) return '';
    var time = pad2(date.getHours()) + ':' + pad2(date.getMinutes());
    if(!includeDate) return time;
    return pad2(date.getMonth() + 1) + '/' + pad2(date.getDate()) + ' ' + time;
  }

  function formatDuration(totalSeconds){
    var seconds = Math.max(0, Math.floor(Number(totalSeconds || 0)));
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var secs = seconds % 60;
    if(hours > 0) return hours + ':' + pad2(minutes) + ':' + pad2(secs);
    return minutes + ':' + pad2(secs);
  }

  function formatLectureSegment(startSeconds, endSeconds){
    if(startSeconds < 0 && endSeconds <= 0){
      return '시작 전';
    }
    if(startSeconds < 0){
      return '시작 전 ~ ' + formatDuration(endSeconds);
    }
    return formatDuration(startSeconds) + ' ~ ' + formatDuration(endSeconds);
  }

  function getFreeLectureStart(firstPaymentDate){
    if(!isValidDate(firstPaymentDate)) return null;
    var start = new Date(firstPaymentDate.getTime());
    start.setHours(19, 0, 0, 0);
    return start;
  }

  function extractYoutubeId(url){
    var host = url.hostname.replace(/^www\./, '').toLowerCase();
    var pathParts = url.pathname.split('/').filter(Boolean);
    if(host === 'youtu.be') return pathParts[0] || '';
    if(host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com'){
      if(url.searchParams.get('v')) return url.searchParams.get('v');
      if((pathParts[0] === 'embed' || pathParts[0] === 'shorts' || pathParts[0] === 'live') && pathParts[1]){
        return pathParts[1];
      }
    }
    return '';
  }

  function normalizeYoutubeUrl(value){
    var raw = String(value || '').trim();
    if(!raw) return '';
    if(!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
    try {
      var url = new URL(raw);
      var id = extractYoutubeId(url);
      if(id) return 'https://www.youtube.com/watch?v=' + encodeURIComponent(id);
      return url.href;
    } catch (error) {
      return '';
    }
  }

  function buildTimestampUrl(baseUrl, seconds){
    if(!baseUrl) return '';
    try {
      var url = new URL(baseUrl);
      url.searchParams.set('t', Math.max(0, Math.floor(seconds)) + 's');
      return url.href;
    } catch (error) {
      return '';
    }
  }

  function excelSerialToDate(serial){
    var utcDays = Math.floor(serial - 25569);
    var utcValue = utcDays * 86400;
    var dateInfo = new Date(utcValue * 1000);
    var fractionalDay = serial - Math.floor(serial) + 0.0000001;
    var totalSeconds = Math.floor(86400 * fractionalDay);
    var seconds = totalSeconds % 60;
    totalSeconds -= seconds;
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    return new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate(), hours, minutes, seconds, 0);
  }

  function normalizeHour(hour, ampm){
    var value = Number(hour || 0);
    var marker = String(ampm || '').toLowerCase();
    if((marker === '오후' || marker === 'pm') && value < 12) value += 12;
    if((marker === '오전' || marker === 'am') && value === 12) value = 0;
    return value;
  }

  function dateFromParts(year, month, day, hour, minute, second, ampm){
    var normalizedHour = normalizeHour(hour, ampm);
    var date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      normalizedHour,
      Number(minute || 0),
      Number(second || 0),
      0
    );
    return isValidDate(date) ? date : null;
  }

  function parsePaymentTimeValue(value, fallbackYear){
    if(value === null || value === undefined || value === '') return null;
    if(isValidDate(value)) return value;
    if(typeof value === 'number') return excelSerialToDate(value);

    var raw = String(value).trim();
    if(!raw) return null;

    var nativeDate = new Date(raw);
    if(isValidDate(nativeDate)) return nativeDate;

    var normalized = raw
      .replace(/[（(][^）)]*[）)]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    var ampmMatch = normalized.match(/오전|오후|am|pm/i);
    var ampm = ampmMatch ? ampmMatch[0] : '';
    var numericText = normalized.replace(/오전|오후|am|pm/ig, ' ');
    var parts = numericText.match(/\d+/g);
    if(!parts || parts.length < 4) return null;

    if(parts[0].length === 4 && parts.length >= 5){
      return dateFromParts(parts[0], parts[1], parts[2], parts[3], parts[4], parts[5], ampm);
    }

    if(parts.length >= 4 && /월|일/.test(normalized)){
      return dateFromParts(fallbackYear || new Date().getFullYear(), parts[0], parts[1], parts[2], parts[3], parts[4], ampm);
    }

    return null;
  }

  function detectFallbackYear(values){
    for(var i = 0; i < values.length; i += 1){
      var raw = values[i];
      if(isValidDate(raw)) return raw.getFullYear();
      var match = String(raw || '').match(/\b(20\d{2}|19\d{2})\b/);
      if(match) return Number(match[1]);
    }
    return new Date().getFullYear();
  }

  function floorToBin(date, binMinutes){
    var d = new Date(date.getTime());
    var minutes = d.getMinutes();
    d.setMinutes(minutes - (minutes % binMinutes), 0, 0);
    return d;
  }

  function ceilToBin(date, binMinutes){
    var floored = floorToBin(date, binMinutes);
    if(floored.getTime() === date.getTime()) return floored;
    return new Date(floored.getTime() + binMinutes * 60 * 1000);
  }

  function sameCalendarDay(a, b){
    return a && b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  function buildPaymentTrend(rosterRows, options){
    var opts = options || {};
    var binMinutes = Math.max(1, Number(opts.binMinutes || DEFAULT_BIN_MINUTES));
    var removeZeroBins = opts.removeZeroBins !== false;
    var freeLectureUrl = normalizeYoutubeUrl(opts.freeLectureUrl);
    var rows = rosterRows || [];
    var rawValues = rows.map(function(row){ return row ? row.paymentTime : ''; });
    var fallbackYear = detectFallbackYear(rawValues);
    var parsed = [];
    var failed = [];
    var rawCount = 0;

    rows.forEach(function(row){
      var raw = row ? row.paymentTime : '';
      if(String(raw || '').trim() === '') return;
      rawCount += 1;
      var date = parsePaymentTimeValue(raw, fallbackYear);
      if(date){
        parsed.push({
          rowNumber: row.rowNumber,
          name: row.name,
          value: raw,
          date: date
        });
      } else {
        failed.push({
          rowNumber: row.rowNumber,
          name: row.name,
          value: raw
        });
      }
    });

    parsed.sort(function(a, b){ return a.date.getTime() - b.date.getTime(); });

    if(!parsed.length){
      return {
        hasData: false,
        binMinutes: binMinutes,
        totalRows: rows.length,
        rawCount: rawCount,
        parsedCount: 0,
        failCount: failed.length,
        failed: failed,
        bins: [],
        displayBins: [],
        freeLectureUrl: freeLectureUrl
      };
    }

    var minDate = parsed[0].date;
    var maxDate = parsed[parsed.length - 1].date;
    var freeLectureStart = getFreeLectureStart(minDate);
    var start = floorToBin(minDate, binMinutes);
    var end = ceilToBin(maxDate, binMinutes);
    var stepMs = binMinutes * 60 * 1000;
    var bins = [];
    for(var time = start.getTime(); time <= end.getTime(); time += stepMs){
      bins.push({
        start: new Date(time),
        end: new Date(time + stepMs),
        count: 0
      });
    }

    parsed.forEach(function(item){
      var index = Math.floor((item.date.getTime() - start.getTime()) / stepMs);
      if(index < 0 || index >= bins.length) return;
      bins[index].count += 1;
    });

    var cumulative = 0;
    bins.forEach(function(bin){
      cumulative += bin.count;
      bin.cumulative = cumulative;
    });

    var zeroBinCount = bins.filter(function(bin){ return bin.count === 0; }).length;
    var displayBins = removeZeroBins ? bins.filter(function(bin){ return bin.count > 0; }) : bins.slice();
    var includeDateInLabels = !sameCalendarDay(start, end);
    var peakCount = displayBins.reduce(function(max, bin){ return Math.max(max, bin.count); }, 0);
    var peakBins = displayBins.filter(function(bin){ return bin.count === peakCount; });

    displayBins.forEach(function(bin){
      bin.label = formatShortLabel(bin.start, includeDateInLabels);
      bin.fullLabel = formatDateTime(bin.start) + ' ~ ' + formatDateTime(bin.end);
      attachLectureSegment(bin, freeLectureStart, freeLectureUrl);
    });

    return {
      hasData: true,
      binMinutes: binMinutes,
      totalRows: rows.length,
      rawCount: rawCount,
      parsedCount: parsed.length,
      failCount: failed.length,
      failed: failed,
      parsed: parsed,
      minDate: minDate,
      maxDate: maxDate,
      start: start,
      end: end,
      freeLectureStart: freeLectureStart,
      freeLectureUrl: freeLectureUrl,
      bins: bins,
      displayBins: displayBins,
      zeroBinCount: zeroBinCount,
      removeZeroBins: removeZeroBins,
      peakCount: peakCount,
      peakLabels: peakBins.map(function(bin){ return bin.label; })
    };
  }

  function attachLectureSegment(bin, freeLectureStart, freeLectureUrl){
    if(!freeLectureStart) return;
    var lectureStartMs = freeLectureStart.getTime();
    var startSeconds = Math.floor((bin.start.getTime() - lectureStartMs) / 1000);
    var endSeconds = Math.floor((bin.end.getTime() - lectureStartMs) / 1000);
    bin.lectureOffsetSeconds = startSeconds;
    bin.lectureEndOffsetSeconds = endSeconds;
    bin.lectureSegment = formatLectureSegment(startSeconds, endSeconds);
    bin.lectureUrl = startSeconds >= 0 ? buildTimestampUrl(freeLectureUrl, startSeconds) : '';
  }

  window.KakaoCheckTrend = {
    buildPaymentTrend: buildPaymentTrend,
    parsePaymentTimeValue: parsePaymentTimeValue,
    formatDateTime: formatDateTime,
    formatShortLabel: formatShortLabel,
    formatDuration: formatDuration
  };
})();
