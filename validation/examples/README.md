# Validation Examples

These files contain actual commit diffs from our validation run against the GHPR dataset.

## Categories

- **TRUE POSITIVE**: High score AND actually introduced a bug (we correctly flagged it)
- **FALSE NEGATIVE**: Low score BUT actually introduced a bug (we missed it)
- **FALSE POSITIVE**: High score BUT not known to be buggy (we may have over-flagged)
- **TRUE NEGATIVE**: Low score AND not known to be buggy (correctly ignored)

## Files

- [TRUE POSITIVE] true_positive_1_dubbo.txt - Score 72.5 - apache/incubator-dubbo
- [TRUE POSITIVE] true_positive_2_gocd.txt - Score 45 - gocd/gocd
- [TRUE POSITIVE] true_positive_3_zaproxy.txt - Score 45 - zaproxy/zaproxy
- [FALSE NEGATIVE] false_negative_1_datepicker.txt - Score 0 - wdullaer/MaterialDateTimePicker
- [FALSE NEGATIVE] false_negative_2_cas.txt - Score 5 - apereo/cas
- [FALSE POSITIVE] false_positive_1_jsonpath.txt - Score 45 - json-path/JsonPath
- [FALSE POSITIVE] false_positive_2_flyway.txt - Score 37.5 - flyway/flyway
- [TRUE NEGATIVE] true_negative_1_datepicker.txt - Score 0 - wdullaer/MaterialDateTimePicker
- [TRUE NEGATIVE] true_negative_2_gocd.txt - Score 0 - gocd/gocd

## Notes

The "clean" commits are random commits from the same repositories. They may or may not
contain bugs - we just don't have labels for them. So "false positives" here may actually
be true positives that weren't in the labeled dataset.
