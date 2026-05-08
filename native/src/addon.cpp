#include <napi.h>
#include <cmath>
#include <cstdint>
#include <iomanip>
#include <sstream>
#include <string>
#include <vector>

static std::string escapePdf(const std::string& s) {
  std::string o;
  o.reserve(s.size() + 8);
  for (unsigned char c : s) {
    if (c == '(' || c == ')' || c == '\\') o += '\\';
    o += static_cast<char>(c);
  }
  return o;
}

static std::string buildPdf(const std::string& title, const std::vector<std::string>& lines) {
  std::ostringstream stream;
  stream << "BT /F1 11 Tf 72 760 Td (" << escapePdf(title) << ") Tj ET\n";
  int y = 740;
  for (const auto& line : lines) {
    if (y < 56) break;
    stream << "BT /F1 9 Tf 72 " << y << " Td (" << escapePdf(line) << ") Tj ET\n";
    y -= 12;
  }
  std::string streamData = stream.str();
  std::ostringstream objs;
  objs << "%PDF-1.4\n";

  std::vector<size_t> xref;
  auto mark = [&]() { xref.push_back(static_cast<size_t>(objs.tellp())); };

  mark();
  objs << "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  mark();
  objs << "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
  mark();
  objs << "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
          "/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n";
  mark();
  objs << "4 0 obj\n<< /Length " << streamData.size() << " >>\nstream\n"
       << streamData << "endstream\nendobj\n";
  mark();
  objs << "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";

  size_t xrefPos = static_cast<size_t>(objs.tellp());
  objs << "xref\n0 6\n";
  objs << "0000000000 65535 f \n";
  for (size_t off : xref) {
    objs << std::setw(10) << std::setfill('0') << off << std::setfill(' ') << " 00000 n \n";
  }
  objs << "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" << xrefPos << "\n%%EOF";
  return objs.str();
}

static Napi::Value GeneratePdfReport(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsArray()) {
    Napi::TypeError::New(env, "generatePdfReport(title, string[])").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string title = info[0].As<Napi::String>().Utf8Value();
  Napi::Array arr = info[1].As<Napi::Array>();
  std::vector<std::string> lines;
  uint32_t len = arr.Length();
  lines.reserve(len);
  for (uint32_t i = 0; i < len; i++) {
    Napi::Value v = arr[i];
    if (v.IsString()) lines.push_back(v.As<Napi::String>().Utf8Value());
  }
  std::string pdf = buildPdf(title, lines);
  return Napi::Buffer<char>::Copy(env, pdf.data(), pdf.size());
}

static Napi::Value AggregateWeeklyCompliance(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsArray()) {
    Napi::TypeError::New(env, "aggregateWeeklyCompliance(number[])").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Array arr = info[0].As<Napi::Array>();
  uint32_t n = arr.Length();
  double sum = 0.0;
  double sumSq = 0.0;
  double maxv = 0.0;
  int peakIndex = 0;
  for (uint32_t i = 0; i < n; i++) {
    double v = arr.Get(i).ToNumber().DoubleValue();
    sum += v;
    sumSq += v * v;
    if (v > maxv) {
      maxv = v;
      peakIndex = static_cast<int>(i);
    }
  }
  double avg = n ? sum / static_cast<double>(n) : 0.0;
  double variance = 0.0;
  if (n > 1) {
    double mean = sum / static_cast<double>(n);
    variance = (sumSq / static_cast<double>(n)) - (mean * mean);
    if (variance < 0) variance = 0;
  }
  Napi::Object out = Napi::Object::New(env);
  out.Set("sum", sum);
  out.Set("avg", avg);
  out.Set("peakIndex", peakIndex);
  out.Set("stdDev", std::sqrt(variance));
  out.Set("count", static_cast<double>(n));
  return out;
}

static Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("generatePdfReport", Napi::Function::New(env, GeneratePdfReport));
  exports.Set("aggregateWeeklyCompliance", Napi::Function::New(env, AggregateWeeklyCompliance));
  return exports;
}

NODE_API_MODULE(aseo_native, Init)
